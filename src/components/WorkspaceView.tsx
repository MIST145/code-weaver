import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Play, Loader2, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { FileTree } from "./FileTree";
import { CodePanel } from "./CodePanel";
import { deobfuscateFile } from "@/lib/deobfuscator";
import { downloadAsZip } from "@/lib/export";
import { buildFileTree } from "@/lib/types";
import type { FileEntry } from "@/lib/types";

interface WorkspaceViewProps {
  initialFiles: FileEntry[];
  onReset: () => void;
}

export function WorkspaceView({ initialFiles, onReset }: WorkspaceViewProps) {
  const [files, setFiles] = useState<FileEntry[]>(() => classifyFilesSync(initialFiles));
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  function classifyFilesSync(fileList: FileEntry[]): FileEntry[] {
    return fileList.map(f => {
      if (!f.isLua) return { ...f, status: 'clean' as const };
      const obfuscatedPattern = /\b[LA]\d+_\d+\b/g;
      const matches = f.content.match(obfuscatedPattern) || [];
      return { ...f, status: matches.length > 5 ? 'obfuscated' as const : 'clean' as const };
    });
  }

  const obfuscatedFiles = files.filter(f => f.status === 'obfuscated' || f.status === 'processing' || f.status === 'done' || f.status === 'error');
  const obfuscatedCount = files.filter(f => f.status === 'obfuscated').length;
  const doneCount = files.filter(f => f.status === 'done').length;
  const luaCount = files.filter(f => f.isLua).length;
  const treeNodes = buildFileTree(files);

  const navigableFiles = files.filter(f => f.isLua);
  const currentIndex = selectedFile ? navigableFiles.findIndex(f => f.path === selectedFile.path) : -1;

  const processFile = async (file: FileEntry) => {
    setFiles(prev => prev.map(f => f.path === file.path ? { ...f, status: 'processing' as const, error: undefined } : f));
    try {
      let result = '';
      await deobfuscateFile(file, files, (chunk) => { result = chunk; });
      setFiles(prev => prev.map(f =>
        f.path === file.path ? { ...f, status: 'done' as const, deobfuscatedContent: result } : f
      ));
    } catch (err: any) {
      setFiles(prev => prev.map(f =>
        f.path === file.path ? { ...f, status: 'error' as const, error: err.message } : f
      ));
      toast({ title: `Error: ${file.name}`, description: err.message, variant: "destructive" });
    }
  };

  const handleDeobfuscateAll = async () => {
    const toProcess = files.filter(f => f.status === 'obfuscated' || f.status === 'error');
    if (toProcess.length === 0) {
      toast({ title: "Nothing to process", description: "No obfuscated files found." });
      return;
    }
    setIsProcessing(true);
    setProgress({ current: 0, total: toProcess.length });

    for (let i = 0; i < toProcess.length; i++) {
      await processFile(toProcess[i]);
      setProgress({ current: i + 1, total: toProcess.length });
      if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, 800));
    }

    setIsProcessing(false);
    toast({ title: "Processing complete", description: `${toProcess.length} files processed.` });
  };

  const handleRetry = async (file: FileEntry) => {
    setIsProcessing(true);
    await processFile(file);
    setIsProcessing(false);
  };

  const handleDownload = () => downloadAsZip(files);

  const handlePrev = () => {
    if (currentIndex > 0) setSelectedFile(navigableFiles[currentIndex - 1]);
  };
  const handleNext = () => {
    if (currentIndex < navigableFiles.length - 1) setSelectedFile(navigableFiles[currentIndex + 1]);
  };

  const displayFile = selectedFile || (navigableFiles.length > 0 ? navigableFiles[0] : null);

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-tight">
            FiveM <span className="text-primary">Deobfuscator</span>
          </h1>
          <Badge variant="secondary" className="text-[10px]">
            {luaCount} Lua files
          </Badge>
          {obfuscatedCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-warning text-warning">
              {obfuscatedCount} obfuscated
            </Badge>
          )}
          {doneCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-success text-success">
              {doneCount} done
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
          <Button
            size="sm"
            onClick={handleDeobfuscateAll}
            disabled={isProcessing || obfuscatedCount === 0}
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1" />
            )}
            Deobfuscate All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={doneCount === 0}>
            <Download className="h-3.5 w-3.5 mr-1" />
            ZIP
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      {isProcessing && progress.total > 0 && (
        <div className="border-b border-border bg-card px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">
              Deobfuscating files...
            </span>
            <span className="text-xs font-mono text-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} className="h-1.5" />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-sidebar overflow-hidden flex flex-col">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Files
          </div>
          <ScrollArea className="flex-1">
            <div className="pb-4">
              <FileTree
                nodes={treeNodes}
                selectedPath={displayFile?.path || null}
                onSelectFile={setSelectedFile}
              />
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {displayFile ? (
            <>
              {/* File nav */}
              <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-1.5">
                <span className="font-mono text-xs text-muted-foreground truncate">{displayFile.path}</span>
                <div className="flex items-center gap-1">
                  {(displayFile.status === 'done' || displayFile.status === 'error') && displayFile.isLua && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleRetry(displayFile)}
                      disabled={isProcessing}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handlePrev} disabled={currentIndex <= 0}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground">{currentIndex + 1}/{navigableFiles.length}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNext} disabled={currentIndex >= navigableFiles.length - 1}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Code comparison */}
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-hidden p-2">
                  <CodePanel title="Original" code={displayFile.content} />
                </div>
                {(displayFile.status === 'done' || displayFile.status === 'processing') && (
                  <div className="flex-1 overflow-hidden p-2">
                    <CodePanel
                      title="Deobfuscated"
                      code={displayFile.deobfuscatedContent || (displayFile.status === 'processing' ? '// Processing...' : '')}
                      showCopy={displayFile.status === 'done'}
                    />
                  </div>
                )}
                {displayFile.status === 'clean' && (
                  <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                    This file is clean — no deobfuscation needed.
                  </div>
                )}
                {displayFile.status === 'obfuscated' && (
                  <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
                    Click "Deobfuscate All" to process this file.
                  </div>
                )}
                {displayFile.status === 'error' && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm px-4 text-center">
                    <div className="text-destructive">Error: {displayFile.error}</div>
                    <Button size="sm" variant="outline" onClick={() => handleRetry(displayFile)} disabled={isProcessing}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Retry this file
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              No files to display
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
