import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NodeRow {
  id: string;
  title: string;
  layer1: string | null;
  keywords: string | null;
  alt_phrasings: string[] | null;
  search_blob: string | null;
}

function scoreResult(node: NodeRow, term: string): number {
  if (!term) return 0;
  const t = term.toLowerCase();
  const title = (node.title ?? "").toLowerCase();
  const keywords = (node.keywords ?? "").toLowerCase();
  const layer1 = (node.layer1 ?? "").toLowerCase();
  const altText = (Array.isArray(node.alt_phrasings) ? node.alt_phrasings : [])
    .join(" ")
    .toLowerCase();
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startMs = Date.now();

  try {
    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    const maxResults = Math.min(Math.max(Number(body.max_results) || 20, 1), 50);

    if (!question) {
      return new Response(
        JSON.stringify({ query: "", results: [], meta: { took_ms: 0, count: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const term = `%${question}%`;
    const { data, error } = await supabase
      .from("nodes")
      .select("id, title, layer1, keywords, alt_phrasings, search_blob")
      .eq("published", true)
      .or(
        `search_blob.ilike.${term},title.ilike.${term}`
      )
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const rows = (data ?? []) as NodeRow[];
    const scored = rows
      .map((r) => ({ ...r, score: scoreResult(r, question) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    const results = scored.map((r) => ({
      id: r.id,
      title: r.title,
      layer1: r.layer1 ?? "",
      score: r.score,
    }));

    const tookMs = Date.now() - startMs;

    // Fire-and-forget analytics
    supabase
      .from("events")
      .insert({
        event_type: "search",
        session_id: "api",
        node_id: null,
        metadata: {
          query: question,
          result_ids: results.map((r) => r.id),
          count: results.length,
          took_ms: tookMs,
        },
      })
      .then(() => {});

    return new Response(
      JSON.stringify({ query: question, results, meta: { took_ms: tookMs, count: results.length } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
