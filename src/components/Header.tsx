import { Gamepad2 } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Gamepad2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">PS2 USB Manager</h1>
          <p className="text-sm text-muted-foreground">
            Manage your Open PS2 Loader games
          </p>
        </div>
      </div>
    </header>
  );
}
