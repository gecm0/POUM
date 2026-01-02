import { useState, useEffect } from "react";
import { Upload, FileUp, Check, AlertCircle } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { convertIso } from "@/lib/commands";
import type { ConversionProgress } from "@/types";

interface IsoImportProps {
  mountPoint: string;
  onComplete: () => void;
}

type ImportState = "idle" | "selecting" | "converting" | "success" | "error";

export function IsoImport({ mountPoint, onComplete }: IsoImportProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, setState] = useState<ImportState>("idle");
  const [isoPath, setIsoPath] = useState<string | null>(null);
  const [gameName, setGameName] = useState("");
  const [progress, setProgress] = useState<ConversionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "converting") return;

    const unlisten = listen<ConversionProgress>("conversion-progress", (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [state]);

  const handleSelectFile = async () => {
    setState("selecting");
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "ISO Image", extensions: ["iso", "ISO"] }],
      });

      if (selected) {
        const path = selected as string;
        setIsoPath(path);
        const filename = path.split("/").pop()?.split("\\").pop() || "";
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
        setGameName(nameWithoutExt.slice(0, 32));
        setState("idle");
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  };

  const handleConvert = async () => {
    if (!isoPath || !gameName) return;

    setState("converting");
    setProgress(null);
    setError(null);

    try {
      await convertIso(isoPath, mountPoint, gameName);
      setState("success");
      onComplete();
    } catch (e) {
      setState("error");
      setError(String(e));
    }
  };

  const handleClose = () => {
    if (state === "converting") return;
    setDialogOpen(false);
    setTimeout(() => {
      setState("idle");
      setIsoPath(null);
      setGameName("");
      setProgress(null);
      setError(null);
    }, 200);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && state === "converting") return;
    setDialogOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => {
        setState("idle");
        setIsoPath(null);
        setGameName("");
        setProgress(null);
        setError(null);
      }, 200);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import ISO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import ISO</DialogTitle>
          <DialogDescription>
            Convert a PS2 ISO file to USBExtreme format for Open PS2 Loader
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ISO File</label>
            <div className="flex gap-2">
              <Input
                value={isoPath || ""}
                placeholder="No file selected"
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleSelectFile}
                disabled={state === "converting"}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Game Name</label>
            <Input
              value={gameName}
              onChange={(e) => setGameName(e.target.value.slice(0, 32))}
              placeholder="Enter game name"
              maxLength={32}
              disabled={state === "converting"}
            />
            <p className="text-xs text-muted-foreground">
              {gameName.length}/32 characters
            </p>
          </div>

          {state === "converting" && progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Converting part {progress.current_part} of {progress.total_parts}
                </span>
                <span>{progress.percent.toFixed(1)}%</span>
              </div>
              <Progress value={progress.percent} />
            </div>
          )}

          {state === "success" && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-green-600 dark:text-green-400">
              <Check className="h-5 w-5" />
              <span>Game imported successfully!</span>
            </div>
          )}

          {state === "error" && error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={state === "converting"}
          >
            {state === "success" ? "Close" : "Cancel"}
          </Button>
          {state !== "success" && (
            <Button
              onClick={handleConvert}
              disabled={!isoPath || !gameName || state === "converting"}
            >
              {state === "converting" ? "Converting..." : "Convert"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
