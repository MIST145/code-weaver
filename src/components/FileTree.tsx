import { useState } from "react";
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FileTreeNode, FileEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (file: FileEntry) => void;
}

export function FileTree({ nodes, selectedPath, onSelectFile }: FileTreeProps) {
  return (
    <div className="text-sm">
      {nodes.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

function FileTreeItem({
  node,
  depth,
  selectedPath,
  onSelectFile,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (file: FileEntry) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = node.isFile && node.path === selectedPath;

  if (node.isFile) {
    const file = node.fileEntry!;
    return (
      <button
        onClick={() => onSelectFile(file)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left hover:bg-accent/50 transition-colors",
          isSelected && "bg-accent text-accent-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs">{node.name}</span>
        <StatusBadge status={file.status} />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left hover:bg-accent/50 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {expanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
        )}
        <span className="truncate text-xs font-medium">{node.name}</span>
      </button>
      {expanded && node.children.map(child => (
        <FileTreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: FileEntry['status'] }) {
  switch (status) {
    case 'clean':
      return <Badge variant="outline" className="ml-auto h-4 px-1 text-[10px] border-success text-success">Clean</Badge>;
    case 'obfuscated':
      return <Badge variant="outline" className="ml-auto h-4 px-1 text-[10px] border-warning text-warning">Obfuscated</Badge>;
    case 'processing':
      return <Badge variant="outline" className="ml-auto h-4 px-1 text-[10px] border-primary text-primary animate-pulse">Processing</Badge>;
    case 'done':
      return <Badge variant="outline" className="ml-auto h-4 px-1 text-[10px] border-success text-success">Done</Badge>;
    case 'error':
      return <Badge variant="outline" className="ml-auto h-4 px-1 text-[10px] border-destructive text-destructive">Error</Badge>;
    default:
      return null;
  }
}
