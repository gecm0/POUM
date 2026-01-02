import { Disc } from "lucide-react";
import { GameCard } from "./GameCard";
import type { Game } from "@/types";

interface GameListProps {
  games: Game[];
  onRename: (oldName: string, newName: string) => void;
  onDelete: (name: string) => void;
}

export function GameList({ games, onRename, onDelete }: GameListProps) {
  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <Disc className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg font-medium text-muted-foreground">
          No games found
        </p>
        <p className="text-sm text-muted-foreground/75">
          Import an ISO to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {games.map((game) => (
        <GameCard
          key={`${game.serial}-${game.name}`}
          game={game}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
