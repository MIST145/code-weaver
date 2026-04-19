// Splits a Lua source file into chunks at "safe" boundaries so each part
// fits within the context window of a free AI chatbot (Claude, ChatGPT, etc.).
// Ported from the standalone Lua AI Splitter HTML tool.

export interface SplitPart {
  name: string;
  content: string;
  lines: number;
  tokens: number;
  overLimit: boolean;
}

export interface SplitOptions {
  baseName: string;
  tokenLimit: number;
  charsPerToken: number;
}

export interface PlatformPreset {
  id: string;
  name: string;
  short: string;
  color: string;
  tokens: number;
  charsPerToken: number;
  info: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { id: 'claude',   name: 'Claude',   short: 'C',  color: '#c96442', tokens: 6000,  charsPerToken: 4, info: 'Claude free — 200k context but safer to keep parts ≤6k tokens.' },
  { id: 'chatgpt',  name: 'ChatGPT',  short: 'G',  color: '#19c37d', tokens: 6000,  charsPerToken: 4, info: 'ChatGPT free (GPT-4o mini) — limited window, ≤6k tokens per part.' },
  { id: 'gemini',   name: 'Gemini',   short: 'Ge', color: '#4285f4', tokens: 7000,  charsPerToken: 4, info: 'Gemini free (1.5 Flash) — supports ~8k tokens, 7k is conservative.' },
  { id: 'deepseek', name: 'DeepSeek', short: 'D',  color: '#4f6ef7', tokens: 8000,  charsPerToken: 4, info: 'DeepSeek free (V3/R1) — 64k context, 8k per part is safe.' },
  { id: 'qwen',     name: 'Qwen',     short: 'Q',  color: '#8956e2', tokens: 7000,  charsPerToken: 4, info: 'Qwen free (Qwen2.5) — 32k context, 7k per part.' },
  { id: 'custom',   name: 'Custom',   short: '✎',  color: '#555555', tokens: 20000, charsPerToken: 4, info: 'Custom — set the token limit manually.' },
];

// Classify each line as safe-to-cut-after using local structural balance only.
// Works even on heavily obfuscated Lua where global depth never returns to 0.
function classifySafeLines(lines: string[]): Uint8Array {
  const safe = new Uint8Array(lines.length);
  let inML = false;
  let mlEq = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    // multiline strings
    if (inML) {
      const close = ']' + '='.repeat(mlEq) + ']';
      if (raw.includes(close)) { inML = false; safe[i] = 1; }
      continue;
    }
    const mlM = t.match(/\[(?<eq>=*)\[/);
    if (mlM && mlM.groups) {
      const eq = mlM.groups.eq.length;
      const close = ']' + '='.repeat(eq) + ']';
      if (!t.slice(t.indexOf(mlM[0]) + mlM[0].length).includes(close)) {
        inML = true; mlEq = eq; continue;
      }
    }

    // strip comments + string literals for keyword counting
    const s = t
      .replace(/--.*$/, '')
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''");

    let opens = 0, closes = 0;
    const oRx = /\b(?:function|do|if|while|for|repeat)\b/g;
    const cRx = /\b(?:end|until)\b/g;
    while (oRx.exec(s) !== null) opens++;
    while (cRx.exec(s) !== null) closes++;

    const balanced  = opens <= closes;
    const isAssign  = /^[A-Za-z_]\w*(?:\[.*?\])?\s*=\s*/.test(s) && opens === closes;
    const isCall    = /\)\s*$/.test(s) && opens === closes;
    const isKeyword = /^(?:end|until|return|break|goto\s+\w+)\b/.test(s);
    const isEmpty   = s.trim() === '';
    const isComment = t.startsWith('--');

    if (balanced && (isAssign || isCall || isKeyword || isEmpty || isComment)) {
      safe[i] = 1;
    }
  }
  return safe;
}

export interface SplitResult {
  parts: SplitPart[];
  totalLines: number;
  totalChars: number;
  estimatedTokens: number;
  safeCutLines: number;
  emergencyCuts: number;
}

export function splitLuaForAI(content: string, opts: SplitOptions): SplitResult {
  const { baseName, tokenLimit, charsPerToken } = opts;
  const charLimit = tokenLimit * charsPerToken;
  const lines = content.split('\n');
  const safe = classifySafeLines(lines);
  const safeCutLines = safe.reduce((s, v) => s + v, 0);

  const parts: SplitPart[] = [];
  let partLines: string[] = [];
  let partChars = 0;
  let lastSafeLocal = -1;
  let emergencyCuts = 0;

  const flushAt = (localEnd: number) => {
    if (localEnd < 0 || partLines.length === 0) return;
    const chunk = partLines.splice(0, localEnd + 1);
    partChars = partLines.reduce((s, l) => s + l.length + 1, 0);
    lastSafeLocal = -1;
    const text = chunk.join('\n');
    const tokens = Math.ceil(text.length / charsPerToken);
    parts.push({
      name: `${baseName}_part${parts.length + 1}.lua`,
      content: text,
      lines: chunk.length,
      tokens,
      overLimit: tokens > tokenLimit,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    partLines.push(lines[i]);
    partChars += lines[i].length + 1;
    if (safe[i]) lastSafeLocal = partLines.length - 1;

    if (partChars >= charLimit) {
      if (lastSafeLocal >= 0) {
        flushAt(lastSafeLocal);
      } else {
        let fallback = partLines.length - 1;
        for (let b = partLines.length - 1; b >= Math.max(0, partLines.length - 200); b--) {
          if (partLines[b].trim() !== '') { fallback = b; break; }
        }
        flushAt(fallback);
        emergencyCuts++;
      }
    }
  }

  if (partLines.length > 0) {
    const text = partLines.join('\n');
    const tokens = Math.ceil(text.length / charsPerToken);
    parts.push({
      name: `${baseName}_part${parts.length + 1}.lua`,
      content: text,
      lines: partLines.length,
      tokens,
      overLimit: tokens > tokenLimit,
    });
  }

  return {
    parts,
    totalLines: lines.length,
    totalChars: content.length,
    estimatedTokens: Math.ceil(content.length / charsPerToken),
    safeCutLines,
    emergencyCuts,
  };
}

export async function downloadPartsAsZip(parts: SplitPart[], zipName: string) {
  const JSZip = (await import('jszip')).default;
  const { saveAs } = await import('file-saver');
  const zip = new JSZip();
  for (const p of parts) zip.file(p.name, p.content);
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${zipName}.zip`);
}

export function downloadPart(part: SplitPart) {
  const blob = new Blob([part.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = part.name;
  a.click();
  URL.revokeObjectURL(url);
}
