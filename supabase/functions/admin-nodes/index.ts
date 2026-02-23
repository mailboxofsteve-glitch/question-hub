import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

  // --- Auth: validate JWT and check admin role ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }

  const userId = claimsData.claims.sub;

  // Use service role client to check admin role (bypasses RLS)
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roleRows } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "editor"]);

  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
  if (roles.length === 0) {
    return json({ error: "Forbidden: admin or editor role required" }, 403);
  }

  const isEditor = roles.includes("editor");

  // --- Proceed with admin operations using service role client ---
  const supabase = serviceClient;

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
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
        const publishedParam = url.searchParams.get("published");
        let query = supabase.from("nodes").select("*").order("updated_at", { ascending: false });
        if (publishedParam !== null) {
          query = query.eq("published", publishedParam === "true");
        }
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);

        // Lookup creator emails from profiles table
        const creatorIds = [...new Set((data ?? []).map((n: any) => n.created_by).filter(Boolean))];
        let emailMap: Record<string, string> = {};
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email")
            .in("id", creatorIds);
          for (const p of profiles ?? []) {
            if (p.email) emailMap[p.id] = p.email;
          }
        }
        const enriched = (data ?? []).map((n: any) => ({
          ...n,
          created_by_email: n.created_by ? (emailMap[n.created_by] ?? null) : null,
        }));
        return json(enriched);
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
          published: isEditor ? (body.published ?? false) : false,
          search_blob: "",
          created_by: userId,
        };
        insertData.search_blob = buildSearchBlob(insertData);
        const { data, error } = await supabase.from("nodes").insert(insertData).select().single();
        if (error) return json({ error: error.message }, 400);
        return json(data, 201);
      }

      case "PUT": {
        if (!nodeId) return json({ error: "Node ID required" }, 400);
        const body = await req.json();
        const updateData: Record<string, unknown> = {};
        if ("title" in body) updateData.title = body.title;
        if ("alt_phrasings" in body) updateData.alt_phrasings = body.alt_phrasings;
        if ("category" in body) updateData.category = body.category;
        if ("keywords" in body) updateData.keywords = body.keywords;
        if ("layer1" in body) updateData.layer1 = body.layer1;
        if ("layer2_json" in body) updateData.layer2_json = body.layer2_json;
        if ("layer3_json" in body) updateData.layer3_json = body.layer3_json;
        if ("published" in body && isEditor) updateData.published = body.published;

        if (Object.keys(updateData).length === 0) {
          return json({ error: "No fields to update" }, 400);
        }

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
        if (!isEditor) return json({ error: "Forbidden: only editors can delete nodes" }, 403);
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
