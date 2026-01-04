export function Header() {
  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <img src="/poum-logo.png" alt="POUM Logo" className="h-10 w-10" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">POUM</h1>
          <p className="text-sm text-muted-foreground">
            PS2 OPL USB Manager
          </p>
        </div>
      </div>
    </header>
  );
}
