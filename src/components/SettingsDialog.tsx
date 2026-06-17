import { useState, useEffect } from "react";
import { Settings, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  AI_MODELS, AIModelId, AI_PROVIDERS, AIProviderId,
  POLLINATIONS_MODELS, PollinationsModelId,
  getStoredApiKey, setStoredApiKey,
  getStoredModel, setStoredModel,
  getStoredProvider, setStoredProvider,
  getStoredPollinationsModel, setStoredPollinationsModel,
} from "@/lib/aiSettings";

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<AIProviderId>("lovable");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<AIModelId>("google/gemini-3-flash-preview");
  const [pollModel, setPollModel] = useState<PollinationsModelId>("qwen-coder");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setProvider(getStoredProvider());
      setApiKey(getStoredApiKey());
      setModel(getStoredModel());
      setPollModel(getStoredPollinationsModel());
    }
  }, [open]);

  const handleSave = () => {
    setStoredProvider(provider);
    setStoredApiKey(apiKey.trim());
    setStoredModel(model);
    setStoredPollinationsModel(pollModel);
    const msg =
      provider === "pollinations" ? "Using Pollinations.ai (free, no key)."
      : provider === "gemini" ? "Using your Gemini API key."
      : "Using built-in AI (subject to credits).";
    toast({ title: "Settings saved", description: msg });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-3.5 w-3.5 mr-1" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <DialogDescription>
            Choose which AI backend handles deobfuscation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as AIProviderId)}>
              <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider === "pollinations" && (
            <div className="space-y-2">
              <Label htmlFor="pollModel">Pollinations Model</Label>
              <Select value={pollModel} onValueChange={(v) => setPollModel(v as PollinationsModelId)}>
                <SelectTrigger id="pollModel"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POLLINATIONS_MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Free public endpoint at{" "}
                <a href="https://pollinations.ai" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5">
                  pollinations.ai <ExternalLink className="h-3 w-3" />
                </a>
                . No signup or API key required. Rate-limited and best-effort — for heavy use add a Gemini key.
              </p>
            </div>
          )}

          {(provider === "lovable" || provider === "gemini") && (
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={(v) => setModel(v as AIModelId)}>
                <SelectTrigger id="model"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {provider === "gemini" && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey" type={showKey ? "text" : "password"} placeholder="AIza..."
                  value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                  className="pr-9 font-mono text-xs"
                />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() => setShowKey(s => !s)}>
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Stored locally only. Get a free key at{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5">
                  aistudio.google.com <ExternalLink className="h-3 w-3" />
                </a>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
