export const AI_PROVIDERS = [
  { id: "lovable", label: "Built-in AI (Lovable, uses credits)" },
  { id: "pollinations", label: "Pollinations.ai (free, no API key)" },
  { id: "gemini", label: "Google Gemini (free, your API key)" },
] as const;
export type AIProviderId = typeof AI_PROVIDERS[number]["id"];

export const AI_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview, fast)" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview, best)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (free tier)" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (cheapest)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (high quality)" },
] as const;
export type AIModelId = typeof AI_MODELS[number]["id"];

// Pollinations text models available anonymously (no key).
// Only `openai-fast` (GPT-OSS 20B Reasoning) is currently available without auth.
export const POLLINATIONS_MODELS = [
  { id: "openai-fast", label: "GPT-OSS 20B (reasoning, free)" },
] as const;
export type PollinationsModelId = typeof POLLINATIONS_MODELS[number]["id"];


const KEY_STORAGE = "fivem-deobf:gemini-key";
const MODEL_STORAGE = "fivem-deobf:model";
const PROVIDER_STORAGE = "fivem-deobf:provider";
const POLL_MODEL_STORAGE = "fivem-deobf:pollinations-model";

export function getStoredApiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; }
}
export function setStoredApiKey(key: string) {
  try { key ? localStorage.setItem(KEY_STORAGE, key) : localStorage.removeItem(KEY_STORAGE); } catch {}
}
export function getStoredModel(): AIModelId {
  try {
    const m = localStorage.getItem(MODEL_STORAGE) as AIModelId | null;
    if (m && AI_MODELS.some(x => x.id === m)) return m;
  } catch {}
  return "google/gemini-3-flash-preview";
}
export function setStoredModel(model: AIModelId) {
  try { localStorage.setItem(MODEL_STORAGE, model); } catch {}
}
export function getStoredProvider(): AIProviderId {
  try {
    const p = localStorage.getItem(PROVIDER_STORAGE) as AIProviderId | null;
    if (p && AI_PROVIDERS.some(x => x.id === p)) return p;
  } catch {}
  return "lovable";
}
export function setStoredProvider(p: AIProviderId) {
  try { localStorage.setItem(PROVIDER_STORAGE, p); } catch {}
}
export function getStoredPollinationsModel(): PollinationsModelId {
  try {
    const m = localStorage.getItem(POLL_MODEL_STORAGE) as PollinationsModelId | null;
    if (m && POLLINATIONS_MODELS.some(x => x.id === m)) return m;
  } catch {}
  return "qwen-coder";
}
export function setStoredPollinationsModel(m: PollinationsModelId) {
  try { localStorage.setItem(POLL_MODEL_STORAGE, m); } catch {}
}
