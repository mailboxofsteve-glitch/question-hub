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

/* ── Types ── */

interface NodeRow {
  id: string;
  title: string;
  category: string | null;
  layer1: string | null;
  keywords: string | null;
  alt_phrasings: string[] | null;
  search_blob: string | null;
}

interface ResponseNode {
  id: string;
  title: string;
  layer1: string | null;
  explanation: string | null;
}

interface LlmResult {
  nodes: { id: string; explanation: string }[];
}

/* ── Relevance scoring ── */

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

/* ── LLM call ── */

async function callLlm(
  query: string,
  nodes: NodeRow[],
  apiKey: string
): Promise<LlmResult | null> {
  try {
    const nodeDescriptions = nodes
      .map(
        (n, i) =>
          `[${i + 1}] id="${n.id}" title="${n.title}"${n.layer1 ? ` layer1="${n.layer1}"` : ""}`
      )
      .join("\n");

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "navigation_response",
          description:
            "Return per-node relevance explanations.",
          parameters: {
            type: "object",
            properties: {
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "The node id." },
                    explanation: {
                      type: "string",
                      description:
                        "1-2 sentence explanation of why this node is relevant.",
                    },
                  },
                  required: ["id", "explanation"],
                },
              },
            },
            required: ["nodes"],
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
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a navigation assistant. Using only the node content provided, write 1-2 sentences explaining why each node is relevant to the user's question. Do not add claims, arguments, or information not present in the node text.",
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

    return JSON.parse(toolCall.function.arguments) as LlmResult;
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
    const { query, category, limit = 5 } = await req.json();

    const hasQuery =
      query && typeof query === "string" && query.trim().length > 0;

    if (!hasQuery && !category) {
      return json({ error: "query or category is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let q = supabase
      .from("nodes")
      .select(
        "id, title, category, layer1, keywords, alt_phrasings, search_blob"
      )
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

    // Zero results → skip LLM
    if (!rawNodes || rawNodes.length === 0) {
      return json({
        nodes: [],
        query_echo: trimmedQuery,
        message:
          "No results found. Try rephrasing your question or using different keywords.",
      });
    }

    // Rank and take top N
    const ranked = (rawNodes as NodeRow[])
      .map((n) => ({
        ...n,
        _score: trimmedQuery ? scoreNode(n, trimmedQuery) : 0,
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, Math.min(limit, 50));

    // LLM enrichment (graceful degradation)
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let llmResult: LlmResult | null = null;

    if (apiKey && trimmedQuery && ranked.length > 0) {
      llmResult = await callLlm(trimmedQuery, ranked, apiKey);
    }

    // Build slim response nodes
    const responseNodes: ResponseNode[] = ranked.map(
      ({ id, title, layer1 }) => {
        const llmNode = llmResult?.nodes?.find((n) => n.id === id);
        return { id, title, layer1, explanation: llmNode?.explanation ?? null };
      }
    );

    return json({
      nodes: responseNodes,
      query_echo: trimmedQuery,
    });
  } catch (err) {
    console.error("api-answer error:", err);
    return json({ error: err.message ?? "Internal error" }, 500);
  }
});
