export interface FileEntry {
  path: string;
  name: string;
  content: string;
  isLua: boolean;
  status: 'pending' | 'clean' | 'obfuscated' | 'processing' | 'done' | 'error';
  deobfuscatedContent?: string;
  error?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: FileTreeNode[];
  fileEntry?: FileEntry;
}

export function buildFileTree(files: FileEntry[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const existingNode = current.find(n => n.name === part && n.isFile === isFile);

      if (existingNode) {
        current = existingNode.children;
      } else {
        const node: FileTreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isFile,
          children: [],
          fileEntry: isFile ? file : undefined,
        };
        current.push(node);
        current = node.children;
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}
