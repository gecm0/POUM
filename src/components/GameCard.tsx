import { useState } from "react";
import { Disc, Disc3, Pencil, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Game } from "@/types";

interface GameCardProps {
  game: Game;
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

export function GameCard({ game, onRename, onDelete }: GameCardProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(game.name);

  const handleRename = () => {
    if (newName && newName !== game.name) {
      onRename(game.name, newName);
    }
    setShowRenameDialog(false);
  };

  const handleDelete = () => {
    onDelete(game.name);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="group relative">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {game.media_type === "CD" ? (
                <Disc className="h-5 w-5 text-blue-500" />
              ) : (
                <Disc3 className="h-5 w-5 text-purple-500" />
              )}
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                {game.media_type}
              </span>
            </div>
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setNewName(game.name);
                  setShowRenameDialog(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardTitle className="text-base leading-tight">{game.name}</CardTitle>
          <CardDescription className="font-mono text-xs">
            {game.serial}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatBytes(game.size_bytes)}</span>
            <span>{game.parts} part{game.parts !== 1 ? "s" : ""}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Game</DialogTitle>
            <DialogDescription>
              Enter a new name for "{game.name}"
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Game name"
            maxLength={32}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Game</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{game.name}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
