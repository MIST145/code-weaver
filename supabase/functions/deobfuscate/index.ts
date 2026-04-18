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

const LOVABLE_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
]);

// Map our unified model IDs to Google's Gemini API model names
const GEMINI_MODEL_MAP: Record<string, string> = {
  "google/gemini-3-flash-preview": "gemini-3-flash-preview",
  "google/gemini-3.1-pro-preview": "gemini-3.1-pro-preview",
  "google/gemini-2.5-pro": "gemini-2.5-pro",
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
};

async function callGeminiDirect(apiKey: string, model: string, userPrompt: string): Promise<string> {
  const geminiModel = GEMINI_MODEL_MAP[model] || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("Gemini API error:", res.status, t);
    if (res.status === 429) throw new Error("Gemini rate limit hit. Wait a moment and retry.");
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error("Invalid Gemini API key. Check your key in Settings.");
    }
    throw new Error(`Gemini API error (${res.status})`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
  return text;
}

async function callLovableAI(model: string, userPrompt: string): Promise<{ ok: boolean; status: number; text: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  let response: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LOVABLE_MODELS.has(model) ? model : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (response.status !== 429) break;
    const waitMs = 2000 * Math.pow(2, attempt);
    console.log(`Lovable AI rate limited, retry in ${waitMs}ms`);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  const text = await response!.text();
  return { ok: response!.ok, status: response!.status, text };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fileContent, fileName, cleanFilesContext, userApiKey, model } = await req.json();
    const selectedModel = model || "google/gemini-3-flash-preview";

    let userPrompt = `Deobfuscate this FiveM Lua file: ${fileName}\n\n\`\`\`lua\n${fileContent}\n\`\`\``;
    if (cleanFilesContext) {
      userPrompt += `\n\nHere are clean files from the same resource for context on naming conventions:\n\n${cleanFilesContext}`;
    }

    let code = "";

    if (userApiKey && typeof userApiKey === "string" && userApiKey.trim().length > 0) {
      // Use user-provided Gemini key directly (their own free quota at aistudio.google.com)
      code = await callGeminiDirect(userApiKey.trim(), selectedModel, userPrompt);
    } else {
      // Fall back to Lovable AI gateway
      const result = await callLovableAI(selectedModel, userPrompt);
      if (!result.ok) {
        if (result.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited after multiple retries. Please wait a minute and try again, or add a free Gemini API key in Settings." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (result.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Add a free Gemini API key in Settings (top-right) to keep going for free." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI error:", result.status, result.text);
        throw new Error("AI processing failed");
      }
      const data = JSON.parse(result.text);
      code = data.choices?.[0]?.message?.content || "";
    }

    // Strip markdown code fences if present
    code = code.replace(/^```lua\n?/i, "").replace(/\n?```$/i, "").trim();

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
