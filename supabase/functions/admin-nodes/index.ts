import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate admin password
  const password = req.headers.get("x-admin-password");
  const expectedPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!password || password !== expectedPassword) {
    return unauthorized();
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Path: /admin-nodes or /admin-nodes/{id}
  const nodeId = pathParts.length > 1 ? decodeURIComponent(pathParts[pathParts.length - 1]) : null;

  try {
    switch (req.method) {
      case "GET": {
        if (nodeId) {
          const { data, error } = await supabase
            .from("nodes")
            .select("*")
            .eq("id", nodeId)
            .single();
          if (error) return json({ error: error.message }, 404);
          return json(data);
        }
        // List all nodes (including drafts)
        const publishedParam = url.searchParams.get("published");
        let query = supabase.from("nodes").select("*").order("updated_at", { ascending: false });
        if (publishedParam !== null) {
          query = query.eq("published", publishedParam === "true");
        }
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }

      case "POST": {
        const body = await req.json();
        if (!body.id || !body.title) {
          return json({ error: "id and title are required" }, 400);
        }
        const { data, error } = await supabase.from("nodes").insert({
          id: body.id,
          title: body.title,
          alt_phrasings: body.alt_phrasings ?? [],
          category: body.category ?? null,
          keywords: body.keywords ?? null,
          layer1: body.layer1 ?? null,
          layer2_json: body.layer2_json ?? {},
          layer3_json: body.layer3_json ?? {},
          published: body.published ?? false,
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      case "PUT": {
        if (!nodeId) return json({ error: "Node ID required" }, 400);
        const body = await req.json();
        const { data, error } = await supabase
          .from("nodes")
          .update({
            title: body.title,
            alt_phrasings: body.alt_phrasings,
            category: body.category,
            keywords: body.keywords,
            layer1: body.layer1,
            layer2_json: body.layer2_json,
            layer3_json: body.layer3_json,
            published: body.published,
          })
          .eq("id", nodeId)
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        return json(data);
      }

      case "DELETE": {
        if (!nodeId) return json({ error: "Node ID required" }, 400);
        const { error } = await supabase.from("nodes").delete().eq("id", nodeId);
        if (error) return json({ error: error.message }, 400);
        return json({ success: true });
      }

      default:
        return json({ error: "Method not allowed" }, 405);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
