import { HardDrive, RefreshCw, FolderSync } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { DriveInfo } from "@/types";

interface DriveSelectorProps {
  drives: DriveInfo[];
  selectedDrive: string | null;
  isInitialized: boolean;
  onSelect: (mountPoint: string) => void;
  onRefresh: () => void;
  onInitialize: () => void;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export function DriveSelector({
  drives,
  selectedDrive,
  isInitialized,
  onSelect,
  onRefresh,
  onInitialize,
}: DriveSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={selectedDrive ?? undefined} onValueChange={onSelect}>
        <SelectTrigger className="w-auto min-w-[200px]">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          {selectedDrive ? (
            <SelectValue />
          ) : (
            <span className="text-muted-foreground">
              {drives.length === 0 ? "No drives available" : "Select a USB drive..."}
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          {drives.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No USB drives detected
            </div>
          ) : (
            drives.map((drive) => (
              <SelectItem key={drive.mount_point} value={drive.mount_point}>
                <div className="flex items-center gap-2">
                  <span>{drive.name || drive.mount_point}</span>
                  <span className="text-xs opacity-70">
                    ({formatBytes(drive.available_space)} free)
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh drives">
        <RefreshCw className="h-4 w-4" />
      </Button>

      {selectedDrive && !isInitialized && (
        <Button variant="secondary" onClick={onInitialize}>
          <FolderSync className="mr-2 h-4 w-4" />
          Initialize for OPL
        </Button>
      )}
    </div>
  );
}
