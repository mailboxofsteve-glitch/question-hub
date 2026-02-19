import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function buildSearchBlob(data: Record<string, unknown>): string {
  const title = (data.title as string) ?? "";
  const layer1 = (data.layer1 as string) ?? "";
  const keywords = (data.keywords as string) ?? "";
  const altPhrasings = Array.isArray(data.alt_phrasings)
    ? (data.alt_phrasings as string[]).join(" ")
    : "";
  return [title, layer1, keywords, altPhrasings].filter(Boolean).join(" ");
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
        const insertData = {
          id: body.id,
          title: body.title,
          alt_phrasings: body.alt_phrasings ?? [],
          category: body.category ?? null,
          keywords: body.keywords ?? null,
          layer1: body.layer1 ?? null,
          layer2_json: body.layer2_json ?? {},
          layer3_json: body.layer3_json ?? {},
          published: body.published ?? false,
          search_blob: "",
        };
        insertData.search_blob = buildSearchBlob(insertData);
        const { data, error } = await supabase.from("nodes").insert(insertData).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      case "PUT": {
        if (!nodeId) return json({ error: "Node ID required" }, 400);
        const body = await req.json();
        // Only include fields that are present in the request body
        const updateData: Record<string, unknown> = {};
        if ("title" in body) updateData.title = body.title;
        if ("alt_phrasings" in body) updateData.alt_phrasings = body.alt_phrasings;
        if ("category" in body) updateData.category = body.category;
        if ("keywords" in body) updateData.keywords = body.keywords;
        if ("layer1" in body) updateData.layer1 = body.layer1;
        if ("layer2_json" in body) updateData.layer2_json = body.layer2_json;
        if ("layer3_json" in body) updateData.layer3_json = body.layer3_json;
        if ("published" in body) updateData.published = body.published;

        if (Object.keys(updateData).length === 0) {
          return json({ error: "No fields to update" }, 400);
        }

        // Fetch existing node to merge for search_blob rebuild
        const { data: existing, error: fetchErr } = await supabase
          .from("nodes")
          .select("title, layer1, keywords, alt_phrasings")
          .eq("id", nodeId)
          .single();
        if (fetchErr) return json({ error: fetchErr.message }, 400);

        const merged = { ...existing, ...updateData };
        updateData.search_blob = buildSearchBlob(merged);

        const { data, error } = await supabase
          .from("nodes")
          .update(updateData)
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
