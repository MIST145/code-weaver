import { supabase } from "@/integrations/supabase/client";
import {
  getStoredApiKey, getStoredModel, getStoredProvider, getStoredPollinationsModel,
} from "./aiSettings";
import type { FileEntry } from "./types";

export async function classifyFiles(files: FileEntry[]): Promise<FileEntry[]> {
  return files.map(f => {
    if (!f.isLua) return { ...f, status: 'clean' as const };
    return { ...f, status: detectObfuscation(f.content) ? 'obfuscated' as const : 'clean' as const };
  });
}

function detectObfuscation(content: string): boolean {
  const matches = content.match(/\b[LA]\d+_\d+\b/g) || [];
  return matches.length > 5;
}

export async function deobfuscateFile(
  file: FileEntry,
  allFiles: FileEntry[],
  onDelta: (chunk: string) => void,
): Promise<string> {
  const cleanFiles = allFiles.filter(f => f.status === 'clean' && f.isLua);
  const cleanContext = cleanFiles
    .slice(0, 5)
    .map(f => `=== ${f.path} ===\n${f.content.slice(0, 3000)}`)
    .join('\n\n');

  const provider = getStoredProvider();

  const { data, error } = await supabase.functions.invoke('deobfuscate', {
    body: {
      fileContent: file.content,
      fileName: file.path,
      cleanFilesContext: cleanContext,
      provider,
      userApiKey: provider === 'gemini' ? (getStoredApiKey() || undefined) : undefined,
      model: getStoredModel(),
      pollinationsModel: getStoredPollinationsModel(),
    },
  });

  if (error) {
    let message = error.message || 'Deobfuscation failed';
    try {
      const ctx = (error as any).context;
      if (ctx?.json) {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      } else if (ctx?.text) {
        const body = JSON.parse(await ctx.text());
        if (body?.error) message = body.error;
      }
    } catch {}
    throw new Error(message);
  }

  if (data?.deobfuscatedCode) {
    onDelta(data.deobfuscatedCode);
    return data.deobfuscatedCode;
  }
  throw new Error('No deobfuscated code returned');
}
