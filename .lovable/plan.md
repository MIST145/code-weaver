

# FiveM Lua Deobfuscator Tool

A single-page web tool that lets you upload FiveM Lua scripts (via GitHub link or folder upload) and uses AI to intelligently deobfuscate them with side-by-side comparison.

---

## 1. Upload Interface
- **GitHub Import**: Paste a public or private repo URL. For private repos, optionally enter a GitHub personal access token. The app fetches all `.lua` files from the repository automatically.
- **Folder Upload**: Click to open file explorer and select a folder. All files (including nested subfolders) are uploaded. Non-Lua files are ignored or shown as context-only.
- Uploaded files appear in a file tree sidebar showing the resource structure.

## 2. File Analysis & Processing
- The AI analyzes ALL uploaded files together before deobfuscating anything.
- Files are automatically classified as **clean** (readable) or **obfuscated** (needs processing).
- Clean files are marked with a green badge; obfuscated files with an orange badge.
- A "Deobfuscate All" button kicks off processing. Each obfuscated file is sent to the AI with context from clean files for cross-referencing.

## 3. Side-by-Side Comparison View
- For each processed file: original code on the left, deobfuscated code on the right.
- Syntax-highlighted Lua code in both panels.
- Navigate between files using the file tree or prev/next buttons.
- Clean files are viewable but skipped in the comparison (no changes needed).

## 4. Export Options
- **Download as ZIP**: All deobfuscated files packaged in a ZIP maintaining the original folder structure.
- **Copy individual files**: Copy button on each deobfuscated file panel.
- Clean (unchanged) files are included in the ZIP download for a complete resource.

## 5. Design & UX
- Dark theme by default (developer-friendly).
- Clean, minimal layout: file tree on the left, code comparison in the center.
- Loading indicators per file during AI processing.
- Toast notifications for errors (rate limits, failed fetches, etc.).

## 6. Backend (Lovable Cloud)
- Edge function to proxy AI requests via Lovable AI gateway.
- Edge function to fetch GitHub repository contents (handles authentication for private repos).
- AI uses the detailed FiveM deobfuscation prompt from your description as the system prompt.

