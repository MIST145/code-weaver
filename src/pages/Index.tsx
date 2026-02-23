import { useState, useEffect } from "react";
import { UploadPanel } from "@/components/UploadPanel";
import { WorkspaceView } from "@/components/WorkspaceView";
import type { FileEntry } from "@/lib/types";

const Index = () => {
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  if (files) {
    return <WorkspaceView initialFiles={files} onReset={() => setFiles(null)} />;
  }

  return <UploadPanel onFilesLoaded={setFiles} isLoading={isLoading} setIsLoading={setIsLoading} />;
};

export default Index;
