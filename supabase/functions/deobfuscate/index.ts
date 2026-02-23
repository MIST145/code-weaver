import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a FiveM Lua deobfuscation expert. You analyze obfuscated Lua scripts and produce clean, readable versions.

Rules:
1. Replace all cryptic identifiers (L0_1, L1_1, A0_2, etc.) with descriptive, meaningful names
2. Apply proper indentation (4 spaces)
3. Preserve ALL original functionality exactly
4. Keep all FiveM natives (RegisterNetEvent, TriggerEvent, etc.) unchanged
5. Keep all event names and string literals unchanged
6. Use camelCase for local variables and functions
7. Add brief comments only for complex logic
8. Use context from clean files to inform naming conventions
9. Output ONLY the cleaned Lua code, no explanations or markdown

Common FiveM patterns to recognize:
- Vehicle/prop spawning and tracking (spawnedVehicles, spawnedProps)
- Network entity management
- Player-specific data storage using player ID
- Event-driven architecture with RegisterNetEvent
- Thread management with Citizen.CreateThread`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileContent, fileName, cleanFilesContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userPrompt = `Deobfuscate this FiveM Lua file: ${fileName}\n\n\`\`\`lua\n${fileContent}\n\`\`\``;
    if (cleanFilesContext) {
      userPrompt += `\n\nHere are clean files from the same resource for context on naming conventions:\n\n${cleanFilesContext}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI processing failed");
    }

    const data = await response.json();
    let code = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    code = code.replace(/^```lua\n?/i, '').replace(/\n?```$/i, '').trim();

    return new Response(JSON.stringify({ deobfuscatedCode: code }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deobfuscate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
