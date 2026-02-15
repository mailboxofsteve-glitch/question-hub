import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Same weighted relevance scoring as the client-side hook */
function scoreResult(
  node: { title: string; keywords: string | null; layer1: string | null; alt_phrasings: unknown; search_blob: string | null },
  term: string
): number {
  if (!term) return 0;
  const t = term.toLowerCase();
  const title = (node.title ?? "").toLowerCase();
  const keywords = (node.keywords ?? "").toLowerCase();
  const layer1 = (node.layer1 ?? "").toLowerCase();
  const altText = (Array.isArray(node.alt_phrasings) ? node.alt_phrasings : []).join(" ").toLowerCase();
  const searchBlob = (node.search_blob ?? "").toLowerCase();

  let score = 0;
  if (title === t) score += 10;
  else if (title.startsWith(t)) score += 6;
  else if (title.includes(t)) score += 4;
  if (altText.includes(t)) score += 5;
  if (keywords.includes(t)) score += 3;
  if (searchBlob.includes(t)) score += 2;
  if (layer1.includes(t)) score += 1;
  return score;
}

const SYSTEM_PROMPT = `You are a navigation assistant for a faith-based Q&A knowledge base. Given a user's question and a set of existing content nodes, explain why each node is relevant. You may ONLY summarize or reference information that appears in the provided node content. Do not generate new claims, arguments, theological positions, or information of any kind.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { query, category, limit = 10 } = await req.json();

    if (!query || typeof query !== "string" || !query.trim()) {
      return json({ error: "query is required" }, 400);
    }

    const trimmedQuery = query.trim();
    const resultLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    // --- 1. Search nodes ---
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let q = supabase
      .from("nodes")
      .select("id, title, category, layer1, keywords, alt_phrasings, search_blob")
      .eq("published", true)
      .order("updated_at", { ascending: false });

    if (category) {
      q = q.eq("category", category);
    }

    const term = `%${trimmedQuery}%`;
    q = q.or(
      `title.ilike.${term},keywords.ilike.${term},layer1.ilike.${term},search_blob.ilike.${term}`
    );
    q = q.limit(50); // fetch more, then rank & trim

    const { data: nodes, error: dbError } = await q;
    if (dbError) {
      console.error("DB error:", dbError);
      return json({ error: "Database query failed" }, 500);
    }

    if (!nodes || nodes.length === 0) {
      return json({ query: trimmedQuery, nodes: [], summary: null });
    }

    // --- 2. Rank & trim ---
    const ranked = [...nodes]
      .map((n) => ({ ...n, _score: scoreResult(n, trimmedQuery) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, resultLimit);

    // Strip internal fields for response
    const responseNodes = ranked.map(({ _score, search_blob, alt_phrasings, ...rest }) => rest);

    // --- 3. LLM summarization (graceful degradation) ---
    let summary: string | null = null;
    const nodesWithRelevance: Array<typeof responseNodes[number] & { relevance?: string }> = responseNodes.map((n) => ({ ...n }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY && ranked.length > 0) {
      try {
        const nodeContext = ranked
          .map(
            (n, i) =>
              `Node ${i + 1}: "${n.title}"\nKeywords: ${n.keywords ?? "none"}\nSummary: ${n.layer1 ?? "No summary available"}`
          )
          .join("\n\n");

        const userPrompt = `User question: "${trimmedQuery}"\n\nHere are the matched content nodes:\n\n${nodeContext}`;

        const llmResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "explain_relevance",
                    description:
                      "Return a short relevance explanation for each node and an overall summary.",
                    parameters: {
                      type: "object",
                      properties: {
                        node_explanations: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              node_title: { type: "string" },
                              relevance: { type: "string" },
                            },
                            required: ["node_title", "relevance"],
                            additionalProperties: false,
                          },
                        },
                        summary: { type: "string" },
                      },
                      required: ["node_explanations", "summary"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "explain_relevance" },
              },
            }),
          }
        );

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          const toolCall = llmData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            summary = parsed.summary ?? null;

            // Match explanations back to nodes by title
            if (Array.isArray(parsed.node_explanations)) {
              for (const expl of parsed.node_explanations) {
                const match = nodesWithRelevance.find(
                  (n) => n.title.toLowerCase() === (expl.node_title ?? "").toLowerCase()
                );
                if (match) {
                  match.relevance = expl.relevance;
                }
              }
            }
          }
        } else {
          const errText = await llmResponse.text();
          console.error("LLM error:", llmResponse.status, errText);
          // Graceful degradation: return results without LLM summary
        }
      } catch (llmErr) {
        console.error("LLM call failed:", llmErr);
        // Graceful degradation
      }
    }

    return json({
      query: trimmedQuery,
      nodes: nodesWithRelevance,
      summary,
    });
  } catch (err) {
    console.error("api-answer error:", err);
    return json({ error: err.message ?? "Internal server error" }, 500);
  }
});
