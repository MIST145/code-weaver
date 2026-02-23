import { supabase } from "@/integrations/supabase/client";
import type { FileEntry } from "./types";

export function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('github.com')) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return {
      owner: parts[0],
      repo: parts[1],
      branch: parts.length > 3 && parts[2] === 'tree' ? parts.slice(3).join('/') : undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchGitHubRepo(
  url: string,
  token?: string,
): Promise<FileEntry[]> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error('Invalid GitHub URL');

  const { data, error } = await supabase.functions.invoke('github-fetch', {
    body: {
      owner: parsed.owner,
      repo: parsed.repo,
      branch: parsed.branch,
      token,
    },
  });

  if (error) throw new Error(error.message || 'Failed to fetch repository');

  if (!data?.files || !Array.isArray(data.files)) {
    throw new Error('Invalid response from GitHub fetch');
  }

  return data.files.map((f: { path: string; content: string }) => ({
    path: f.path,
    name: f.path.split('/').pop() || f.path,
    content: f.content,
    isLua: f.path.endsWith('.lua'),
    status: 'pending' as const,
  }));
}
