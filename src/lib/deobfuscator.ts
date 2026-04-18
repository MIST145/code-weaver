import { supabase } from "@/integrations/supabase/client";
import type { FileEntry } from "./types";

export async function classifyFiles(files: FileEntry[]): Promise<FileEntry[]> {
  return files.map(f => {
    if (!f.isLua) return { ...f, status: 'clean' as const };
    const isObfuscated = detectObfuscation(f.content);
    return { ...f, status: isObfuscated ? 'obfuscated' as const : 'clean' as const };
  });
}

function detectObfuscation(content: string): boolean {
  // Check for sequential naming patterns like L0_1, L1_1, A0_2 etc
  const obfuscatedVarPattern = /\b[LA]\d+_\d+\b/g;
  const matches = content.match(obfuscatedVarPattern) || [];
  // If more than 5 obfuscated-looking variables, mark as obfuscated
  return matches.length > 5;
}

export async function deobfuscateFile(
  file: FileEntry,
  allFiles: FileEntry[],
  onDelta: (chunk: string) => void,
): Promise<string> {
  // Build context from clean files
  const cleanFiles = allFiles.filter(f => f.status === 'clean' && f.isLua);
  const cleanContext = cleanFiles
    .slice(0, 5) // Limit context size
    .map(f => `=== ${f.path} ===\n${f.content.slice(0, 3000)}`)
    .join('\n\n');

  const { data, error } = await supabase.functions.invoke('deobfuscate', {
    body: {
      fileContent: file.content,
      fileName: file.path,
      cleanFilesContext: cleanContext,
    },
  });

  // supabase-js wraps non-2xx as FunctionsHttpError; extract the real message from the response body
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
    } catch {
      // fall back to original message
    }
    throw new Error(message);
  }

  if (data?.deobfuscatedCode) {
    onDelta(data.deobfuscatedCode);
    return data.deobfuscatedCode;
  }

  throw new Error('No deobfuscated code returned');
}
