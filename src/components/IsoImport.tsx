import { useState, useEffect } from "react";
import { Upload, FileUp, Check, AlertCircle, X } from "lucide-react";
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

interface IsoFile {
  path: string;
  name: string;
  status: "pending" | "converting" | "success" | "error";
  error?: string;
  progress?: ConversionProgress;
}

type ImportState = "idle" | "selecting" | "converting" | "done";

export function IsoImport({ mountPoint, onComplete }: IsoImportProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, setState] = useState<ImportState>("idle");
  const [files, setFiles] = useState<IsoFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (state !== "converting") return;

    const unlisten = listen<ConversionProgress>("conversion-progress", (event) => {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === currentIndex ? { ...f, progress: event.payload } : f
        )
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [state, currentIndex]);

  const handleSelectFiles = async () => {
    setState("selecting");
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "ISO Image", extensions: ["iso", "ISO"] }],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        const newFiles: IsoFile[] = paths.map((path: string) => {
          const filename = path.split("/").pop()?.split("\\").pop() || "";
          const nameWithoutExt = filename.replace(/\.[^/.]+$/, "").slice(0, 32);
          return {
            path,
            name: nameWithoutExt,
            status: "pending" as const,
          };
        });
        setFiles((prev) => [...prev, ...newFiles]);
        setState("idle");
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  };

  const handleUpdateName = (index: number, newName: string) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, name: newName.slice(0, 32) } : f
      )
    );
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setState("converting");
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status !== "pending") continue;
      
      setCurrentIndex(i);
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "converting" } : f))
      );

      try {
        await convertIso(file.path, mountPoint, file.name);
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "success" } : f))
        );
      } catch (e) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: String(e) } : f
          )
        );
      }
    }

    setState("done");
    onComplete();
  };

  const handleClose = () => {
    if (state === "converting") return;
    setDialogOpen(false);
    setTimeout(() => {
      setState("idle");
      setFiles([]);
      setCurrentIndex(0);
    }, 200);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && state === "converting") return;
    setDialogOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => {
        setState("idle");
        setFiles([]);
        setCurrentIndex(0);
      }, 200);
    }
  };

  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const canConvert = files.length > 0 && files.every((f) => f.name.trim()) && state === "idle";

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import ISO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import ISO</DialogTitle>
          <DialogDescription>
            Convert PS2 ISO files to USBExtreme format for Open PS2 Loader
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <Button
            variant="outline"
            onClick={handleSelectFiles}
            disabled={state === "converting"}
            className="w-full"
          >
            <FileUp className="mr-2 h-4 w-4" />
            {files.length > 0 ? "Add More Files" : "Select ISO Files"}
          </Button>

          {files.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {files.map((file, index) => (
                <div
                  key={file.path}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {file.path.split("/").pop()}
                      </p>
                    </div>
                    {file.status === "pending" && state === "idle" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {file.status === "success" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>

                  {file.status === "pending" && state === "idle" && (
                    <Input
                      value={file.name}
                      onChange={(e) => handleUpdateName(index, e.target.value)}
                      placeholder="Game name"
                      maxLength={32}
                      className="h-8 text-sm"
                    />
                  )}

                  {file.status === "converting" && file.progress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          Part {file.progress.current_part}/{file.progress.total_parts}
                        </span>
                        <span>{file.progress.percent.toFixed(1)}%</span>
                      </div>
                      <Progress value={file.progress.percent} className="h-2" />
                    </div>
                  )}

                  {file.status === "error" && file.error && (
                    <p className="text-xs text-destructive">{file.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {state === "done" && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="text-green-600">{successCount} imported</span>
              {errorCount > 0 && (
                <span className="text-destructive ml-2">{errorCount} failed</span>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={state === "converting"}
          >
            {state === "done" ? "Close" : "Cancel"}
          </Button>
          {state !== "done" && (
            <Button
              onClick={handleConvert}
              disabled={!canConvert}
            >
              {state === "converting"
                ? `Converting ${currentIndex + 1}/${files.length}...`
                : `Convert ${files.length} file${files.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
