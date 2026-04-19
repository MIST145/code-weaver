import { useMemo, useState } from "react";
import { Sparkles, Download, Copy, AlertTriangle, FileCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  PLATFORM_PRESETS,
  splitLuaForAI,
  downloadPartsAsZip,
  downloadPart,
  type SplitResult,
} from "@/lib/luaSplitter";
import type { FileEntry } from "@/lib/types";

interface AnalyzeDialogProps {
  files: FileEntry[];
  currentFile: FileEntry | null;
  disabled?: boolean;
}

export function AnalyzeDialog({ files, currentFile, disabled }: AnalyzeDialogProps) {
  const [open, setOpen] = useState(false);
  const [presetId, setPresetId] = useState("claude");
  const [tokenLimit, setTokenLimit] = useState(6000);
  const [charsPerToken, setCharsPerToken] = useState(4);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [result, setResult] = useState<SplitResult | null>(null);

  const luaFiles = useMemo(() => files.filter(f => f.isLua), [files]);

  // Default selection: current file if Lua, else first obfuscated, else first Lua
  const effectivePath =
    selectedPath ||
    (currentFile?.isLua ? currentFile.path : "") ||
    luaFiles.find(f => f.status === "obfuscated")?.path ||
    luaFiles[0]?.path ||
    "";

  const file = luaFiles.find(f => f.path === effectivePath) || null;
  const preset = PLATFORM_PRESETS.find(p => p.id === presetId)!;

  const handlePresetChange = (id: string) => {
    setPresetId(id);
    const p = PLATFORM_PRESETS.find(x => x.id === id);
    if (p) {
      setTokenLimit(p.tokens);
      setCharsPerToken(p.charsPerToken);
    }
    setResult(null);
  };

  const handleAnalyze = () => {
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    // Prefer deobfuscated content if available, else original
    const source = file.deobfuscatedContent || file.content;
    const baseName = file.name.replace(/\.lua$/i, "");
    const r = splitLuaForAI(source, { baseName, tokenLimit, charsPerToken });
    setResult(r);
    toast({
      title: "Analysis complete",
      description: `Split into ${r.parts.length} part${r.parts.length === 1 ? "" : "s"} for ${preset.name}.`,
    });
  };

  const handleCopyPart = async (content: string, name: string) => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: name });
  };

  const handleDownloadZip = async () => {
    if (!result || !file) return;
    const baseName = file.name.replace(/\.lua$/i, "");
    await downloadPartsAsZip(result.parts, `${baseName}_split_${preset.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || luaFiles.length === 0}>
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Analyze
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Split for free AI analysis
          </DialogTitle>
          <DialogDescription>
            Slice a Lua file into chunks sized for free chatbots (Claude, ChatGPT, Gemini, …).
            Cuts only happen at structurally safe boundaries so logic stays intact.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 overflow-y-auto pr-1">
          {/* File picker */}
          <div className="grid gap-2">
            <Label className="text-xs">File</Label>
            <Select value={effectivePath} onValueChange={(v) => { setSelectedPath(v); setResult(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Lua file" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {luaFiles.map(f => (
                  <SelectItem key={f.path} value={f.path}>
                    <span className="font-mono text-xs">{f.path}</span>
                    {f.deobfuscatedContent && (
                      <span className="ml-2 text-[10px] text-success">(deobfuscated)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform presets */}
          <div className="grid gap-2">
            <Label className="text-xs">Target platform</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`flex flex-col items-center gap-1 rounded-md border p-2 transition-colors ${
                    presetId === p.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ background: p.color }}
                  >
                    {p.short}
                  </span>
                  <span className="text-xs font-medium">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {p.id === "custom" ? "manual" : `~${p.tokens / 1000}k`}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{preset.info}</p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tokenLimit" className="text-xs">Token limit / part</Label>
              <Input
                id="tokenLimit"
                type="number"
                min={500}
                max={200000}
                step={500}
                value={tokenLimit}
                onChange={(e) => { setTokenLimit(parseInt(e.target.value) || 0); setResult(null); }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cpp" className="text-xs">Chars per token (≈)</Label>
              <Input
                id="cpp"
                type="number"
                min={2}
                max={6}
                step={1}
                value={charsPerToken}
                onChange={(e) => { setCharsPerToken(parseInt(e.target.value) || 4); setResult(null); }}
              />
            </div>
          </div>

          {/* Live stats */}
          {file && (
            <div className="grid grid-cols-4 gap-2">
              {(() => {
                const src = file.deobfuscatedContent || file.content;
                const lines = src.split("\n").length;
                const chars = src.length;
                const tokens = Math.ceil(chars / charsPerToken);
                const parts = Math.max(1, Math.ceil(tokens / tokenLimit));
                const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
                return (
                  <>
                    <Stat val={fmt(lines)} lbl="lines" />
                    <Stat val={fmt(chars)} lbl="chars" />
                    <Stat val={fmt(tokens)} lbl="est. tokens" />
                    <Stat val={String(parts)} lbl="parts (est.)" />
                  </>
                );
              })()}
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={!file}>
            <Sparkles className="h-3.5 w-3.5 mr-1" />
            Analyze & split
          </Button>

          {/* Results */}
          {result && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {result.parts.length} parts
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {result.safeCutLines} safe cut points
                  </Badge>
                  {result.emergencyCuts > 0 && (
                    <Badge variant="outline" className="text-[10px] border-warning text-warning">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {result.emergencyCuts} emergency cut{result.emergencyCuts === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleDownloadZip}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  ZIP
                </Button>
              </div>
              <ScrollArea className="h-56 rounded-md border border-border">
                <div className="divide-y divide-border">
                  {result.parts.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <FileCode className={`h-3.5 w-3.5 ${p.overLimit ? "text-destructive" : "text-success"}`} />
                      <span className="font-mono flex-1 truncate">{p.name}</span>
                      <span className="text-muted-foreground">{p.lines}L</span>
                      <span className={p.overLimit ? "text-destructive" : "text-muted-foreground"}>
                        ~{p.tokens >= 1000 ? `${(p.tokens / 1000).toFixed(1)}k` : p.tokens}t
                      </span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleCopyPart(p.content, p.name)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => downloadPart(p)}>
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ val, lbl }: { val: string; lbl: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5">
      <div className="text-base font-semibold text-primary leading-tight">{val}</div>
      <div className="text-[10px] text-muted-foreground">{lbl}</div>
    </div>
  );
}
