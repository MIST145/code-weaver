export const AI_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview, fast)" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (preview, best)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (free tier)" },
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (cheapest)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (high quality)" },
] as const;

export type AIModelId = typeof AI_MODELS[number]["id"];

const KEY_STORAGE = "fivem-deobf:gemini-key";
const MODEL_STORAGE = "fivem-deobf:model";

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
