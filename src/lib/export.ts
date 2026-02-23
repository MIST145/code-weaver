import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FileEntry } from './types';

export async function downloadAsZip(files: FileEntry[], zipName = 'deobfuscated') {
  const zip = new JSZip();

  for (const file of files) {
    const content = file.deobfuscatedContent || file.content;
    zip.file(file.path, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${zipName}.zip`);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
