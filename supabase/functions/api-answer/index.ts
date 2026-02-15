import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ── Relevance scoring (mirrors client-side algorithm) ── */

interface NodeRow {
  id: string;
  title: string;
  category: string | null;
  layer1: string | null;
  keywords: string | null;
  alt_phrasings: string[] | null;
  search_blob: string | null;
}

function scoreNode(node: NodeRow, term: string): number {
  const t = term.toLowerCase();
  const title = (node.title ?? "").toLowerCase();
  const keywords = (node.keywords ?? "").toLowerCase();
  const layer1 = (node.layer1 ?? "").toLowerCase();
  const altText = (node.alt_phrasings ?? []).join(" ").toLowerCase();
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

/* ── LLM call via Lovable AI Gateway ── */

interface LlmResult {
  summary: string;
  nodes: { id: string; relevance: string }[];
}

async function callLlm(
  query: string,
  nodes: NodeRow[],
  apiKey: string
): Promise<LlmResult | null> {
  try {
    const nodeDescriptions = nodes
      .map(
        (n, i) =>
          `[${i + 1}] id="${n.id}" title="${n.title}"${n.layer1 ? ` summary="${n.layer1}"` : ""}${n.keywords ? ` keywords="${n.keywords}"` : ""}`
      )
      .join("\n");

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "navigation_response",
          description:
            "Return the navigation assistant response with per-node relevance and an overall summary.",
          parameters: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description:
                  "A 1-3 sentence summary explaining how the found content relates to the user query. Must ONLY reference provided node content.",
              },
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "The node id." },
                    relevance: {
                      type: "string",
                      description:
                        "1-2 sentence explanation of why this node is relevant. Must ONLY summarize provided content.",
                    },
                  },
                  required: ["id", "relevance"],
                },
              },
            },
            required: ["summary", "nodes"],
          },
        },
      },
    ];

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a navigation assistant for a faith-based Q&A knowledge base. Given a user's question and a set of existing content nodes, explain why each node is relevant. You may ONLY summarize or reference information that appears in the provided node content. Do not generate new claims, arguments, theological positions, or information of any kind. Always call the navigation_response tool.`,
            },
            {
              role: "user",
              content: `User question: "${query}"\n\nAvailable nodes:\n${nodeDescriptions}`,
            },
          ],
          tools,
          tool_choice: {
            type: "function",
            function: { name: "navigation_response" },
          },
          temperature: 0.2,
        }),
      }
    );

    if (!res.ok) {
      console.error("LLM gateway error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return null;

    const parsed = JSON.parse(toolCall.function.arguments);
    return parsed as LlmResult;
  } catch (err) {
    console.error("LLM call failed:", err);
    return null;
  }
}

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { query, category, limit = 10 } = await req.json();

    const hasQuery = query && typeof query === "string" && query.trim().length > 0;

    if (!hasQuery && !category) {
      return json({ error: "query or category is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Search nodes
    let q = supabase
      .from("nodes")
      .select("id, title, category, layer1, keywords, alt_phrasings, search_blob")
      .eq("published", true)
      .order("updated_at", { ascending: false });

    if (category) {
      q = q.eq("category", category);
    }

    const trimmedQuery = hasQuery ? query.trim() : "";

    if (trimmedQuery) {
      const term = `%${trimmedQuery}%`;
      q = q.or(
        `title.ilike.${term},keywords.ilike.${term},layer1.ilike.${term},search_blob.ilike.${term}`
      );
    }

    q = q.limit(50);

    const { data: rawNodes, error } = await q;
    if (error) {
      return json({ error: error.message }, 500);
    }

    // Rank and take top N
    const ranked = (rawNodes as NodeRow[])
      .map((n) => ({ ...n, _score: trimmedQuery ? scoreNode(n, trimmedQuery) : 0 }))
      .sort((a, b) => b._score - a._score)
      .slice(0, Math.min(limit, 50));

    // Prepare clean nodes for response
    const responseNodes = ranked.map(({ _score, ...rest }) => rest);

    // Call LLM for relevance explanations (graceful degradation)
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let llmResult: LlmResult | null = null;

    if (apiKey && responseNodes.length > 0 && trimmedQuery) {
      llmResult = await callLlm(trimmedQuery, responseNodes, apiKey);
    }

    // Merge LLM relevance into nodes
    const nodesWithRelevance = responseNodes.map((node) => {
      const llmNode = llmResult?.nodes?.find((n) => n.id === node.id);
      return {
        ...node,
        relevance: llmNode?.relevance ?? null,
      };
    });

    return json({
      query: trimmedQuery,
      nodes: nodesWithRelevance,
      summary: llmResult?.summary ?? null,
    });
  } catch (err) {
    console.error("api-answer error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
