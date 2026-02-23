import { useState, useRef } from "react";
import { Github, FolderUp, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { fetchGitHubRepo } from "@/lib/github";
import type { FileEntry } from "@/lib/types";

interface UploadPanelProps {
  onFilesLoaded: (files: FileEntry[]) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export function UploadPanel({ onFilesLoaded, isLoading, setIsLoading }: UploadPanelProps) {
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleGitHubImport = async () => {
    if (!githubUrl.trim()) return;
    setIsLoading(true);
    try {
      const files = await fetchGitHubRepo(githubUrl, githubToken || undefined);
      if (files.length === 0) {
        toast({ title: "No files found", description: "The repository appears to be empty.", variant: "destructive" });
        return;
      }
      onFilesLoaded(files);
      toast({ title: "Repository loaded", description: `${files.length} files imported successfully.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setIsLoading(true);

    try {
      const files: FileEntry[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const path = (file as any).webkitRelativePath || file.name;
        const content = await file.text();
        files.push({
          path,
          name: file.name,
          content,
          isLua: file.name.endsWith('.lua'),
          status: 'pending',
        });
      }
      if (files.length === 0) {
        toast({ title: "No files found", variant: "destructive" });
        return;
      }
      onFilesLoaded(files);
      toast({ title: "Folder loaded", description: `${files.length} files uploaded.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            FiveM Lua <span className="text-primary">Deobfuscator</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload a FiveM resource via GitHub link or folder to intelligently deobfuscate Lua scripts.
          </p>
        </div>

        {/* GitHub Import */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Github className="h-4 w-4" />
            Import from GitHub
          </div>
          <Input
            placeholder="https://github.com/user/repo"
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGitHubImport()}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setShowToken(!showToken)}
            >
              <KeyRound className="h-3 w-3 mr-1" />
              {showToken ? 'Hide' : 'Private repo? Add token'}
            </Button>
          </div>
          {showToken && (
            <Input
              type="password"
              placeholder="GitHub personal access token (optional)"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
            />
          )}
          <Button onClick={handleGitHubImport} disabled={isLoading || !githubUrl.trim()} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Github className="h-4 w-4 mr-2" />}
            Import Repository
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Folder Upload */}
        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FolderUp className="h-4 w-4" />
            Upload Folder
          </div>
          <p className="text-xs text-muted-foreground">
            Select a folder from your computer. All files including subfolders will be uploaded.
          </p>
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore webkitdirectory is a non-standard attribute
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={handleFolderUpload}
          />
          <Button
            variant="outline"
            onClick={() => folderInputRef.current?.click()}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderUp className="h-4 w-4 mr-2" />}
            Choose Folder
          </Button>
        </div>
      </div>
    </div>
  );
}
