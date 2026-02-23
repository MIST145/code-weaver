import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { owner, repo, branch, token } = await req.json();
    if (!owner || !repo) throw new Error("owner and repo are required");

    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "FiveM-Deobfuscator",
    };
    if (token) headers["Authorization"] = `token ${token}`;

    // Get the default branch if not specified
    let targetBranch = branch;
    if (!targetBranch) {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!repoRes.ok) {
        const text = await repoRes.text();
        throw new Error(`Failed to fetch repo info: ${repoRes.status} ${text}`);
      }
      const repoData = await repoRes.json();
      targetBranch = repoData.default_branch || "main";
    }

    // Get the tree recursively
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
      { headers }
    );
    if (!treeRes.ok) {
      const text = await treeRes.text();
      throw new Error(`Failed to fetch tree: ${treeRes.status} ${text}`);
    }
    const treeData = await treeRes.json();

    // Filter to reasonable file types and sizes
    const items = (treeData.tree || []).filter(
      (item: any) => item.type === "blob" && item.size < 500000
    );

    // Fetch file contents in parallel (limit to 50 files)
    const filesToFetch = items.slice(0, 50);
    const files = await Promise.all(
      filesToFetch.map(async (item: any) => {
        try {
          const contentRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${targetBranch}`,
            { headers }
          );
          if (!contentRes.ok) return null;
          const contentData = await contentRes.json();
          
          if (contentData.encoding === "base64" && contentData.content) {
            const content = atob(contentData.content.replace(/\n/g, ""));
            return { path: item.path, content };
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    const validFiles = files.filter(Boolean);

    return new Response(JSON.stringify({ files: validFiles }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("github-fetch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
