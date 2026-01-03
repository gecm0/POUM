import { useState, useEffect } from "react";
import { Upload, FileUp, Check, AlertCircle, X, HardDrive, Disc } from "lucide-react";
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
import { convertIso, getFileSizes } from "@/lib/commands";
import type { ConversionProgress } from "@/types";

interface IsoImportProps {
  mountPoint: string;
  availableSpace: number;
  onComplete: () => void;
}

interface IsoFile {
  path: string;
  name: string;
  size: number;
  status: "pending" | "converting" | "success" | "error";
  error?: string;
  progress?: ConversionProgress;
}

type ImportState = "idle" | "selecting" | "converting" | "done";

export function IsoImport({ mountPoint, availableSpace, onComplete }: IsoImportProps) {
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
        const sizes = await getFileSizes(paths);
        const newFiles: IsoFile[] = paths.map((path: string, index: number) => {
          const filename = path.split("/").pop()?.split("\\").pop() || "";
          const nameWithoutExt = filename.replace(/\.[^/.]+$/, "").slice(0, 32);
          return {
            path,
            name: nameWithoutExt,
            size: sizes[index] ?? 0,
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
  
  const totalRequiredSpace = files
    .filter((f) => f.status === "pending")
    .reduce((sum, f) => sum + f.size, 0);
  const hasInsufficientSpace = totalRequiredSpace > availableSpace;
  const canConvert = files.length > 0 && files.every((f) => f.name.trim()) && state === "idle" && !hasInsufficientSpace;

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const spaceAfterImport = availableSpace - totalRequiredSpace;
  const usagePercent = availableSpace > 0 
    ? Math.min(100, (totalRequiredSpace / availableSpace) * 100)
    : 0;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import ISO
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>Import ISO Files</DialogTitle>
          <DialogDescription>
            Convert PS2 ISO files to USBExtreme format for Open PS2 Loader
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {files.length === 0 && state !== "converting" && (
            <div 
              onClick={handleSelectFiles}
              className="flex-1 min-h-[200px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <FileUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Select ISO files</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click to browse or drag and drop
                </p>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="flex flex-col min-h-0 gap-4">
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <HardDrive className="h-4 w-4" />
                    <span>Storage</span>
                  </div>
                  {state === "idle" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectFiles}
                      className="h-7 text-xs"
                    >
                      <FileUp className="h-3 w-3 mr-1" />
                      Add more
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {files.filter(f => f.status === "pending").length} file{files.filter(f => f.status === "pending").length !== 1 ? "s" : ""} to import
                    </span>
                    <span className="font-medium">{formatBytes(totalRequiredSpace)}</span>
                  </div>
                  
                  <div className="relative">
                    <Progress 
                      value={usagePercent} 
                      className={`h-2 ${hasInsufficientSpace ? "[&>div]:bg-destructive" : ""}`}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {hasInsufficientSpace 
                        ? `Need ${formatBytes(totalRequiredSpace - availableSpace)} more`
                        : `${formatBytes(spaceAfterImport)} will remain`
                      }
                    </span>
                    <span>{formatBytes(availableSpace)} available</span>
                  </div>
                </div>

                {hasInsufficientSpace && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-2.5 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Not enough space on drive. Remove files or free up storage.</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-2 pr-1">
                  {files.map((file, index) => (
                    <div
                      key={file.path}
                      className={`rounded-lg border p-3 transition-colors ${
                        file.status === "converting" ? "border-primary bg-primary/5" :
                        file.status === "success" ? "border-green-500/30 bg-green-500/5" :
                        file.status === "error" ? "border-destructive/30 bg-destructive/5" :
                        "bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          file.status === "converting" ? "bg-primary/10" :
                          file.status === "success" ? "bg-green-500/10" :
                          file.status === "error" ? "bg-destructive/10" :
                          "bg-muted"
                        }`}>
                          {file.status === "success" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : file.status === "error" ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : file.status === "converting" ? (
                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Disc className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground truncate">
                              {file.path.split("/").pop()?.split("\\").pop()}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatBytes(file.size)}
                              </span>
                              {file.status === "pending" && state === "idle" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveFile(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {file.status === "pending" && state === "idle" && (
                            <Input
                              value={file.name}
                              onChange={(e) => handleUpdateName(index, e.target.value)}
                              placeholder="Game name (required)"
                              maxLength={32}
                              className="h-8 text-sm"
                            />
                          )}

                          {(file.status !== "pending" || state !== "idle") && (
                            <p className="text-sm font-medium truncate">{file.name}</p>
                          )}

                          {file.status === "converting" && file.progress && (
                            <div className="space-y-1 pt-1">
                              <Progress value={file.progress.percent} className="h-1.5" />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Part {file.progress.current_part}/{file.progress.total_parts}</span>
                                <span>{file.progress.percent.toFixed(0)}%</span>
                              </div>
                            </div>
                          )}

                          {file.status === "error" && file.error && (
                            <p className="text-xs text-destructive">{file.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {state === "done" && (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      errorCount > 0 ? "bg-yellow-500/10" : "bg-green-500/10"
                    }`}>
                      {errorCount > 0 ? (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Check className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {errorCount > 0 ? "Import completed with errors" : "Import complete"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {successCount} imported successfully
                        {errorCount > 0 && `, ${errorCount} failed`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 mt-4 border-t">
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
                : files.length === 0 
                  ? "Select files to import"
                  : `Import ${files.length} file${files.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
