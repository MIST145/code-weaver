import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { copyToClipboard } from "@/lib/export";
import hljs from "highlight.js/lib/core";
import lua from "highlight.js/lib/languages/lua";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("lua", lua);

interface CodePanelProps {
  title: string;
  code: string;
  showCopy?: boolean;
}

export function CodePanel({ title, code, showCopy = false }: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedLines = useMemo(() => {
    try {
      const html = hljs.highlight(code, { language: "lua", ignoreIllegals: true }).value;
      return html.split("\n");
    } catch {
      return code.split("\n");
    }
  }, [code]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-code-bg">
      <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {showCopy && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>
      <div className="code-panel flex-1 overflow-auto p-0 hljs">
        <table className="w-full border-collapse">
          <tbody>
            {highlightedLines.map((line, i) => (
              <tr key={i} className="hover:bg-code-highlight transition-colors">
                <td className="select-none border-r border-border px-3 py-0 text-right align-top font-mono text-xs text-muted-foreground/50 w-12">
                  {i + 1}
                </td>
                <td className="px-3 py-0 align-top">
                  <pre
                    className="font-mono text-xs whitespace-pre-wrap break-all"
                    dangerouslySetInnerHTML={{ __html: line || " " }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
