import { LogoTile } from "./logo";
import { compact } from "@/lib/format";
import type { Group } from "@/lib/types";

function VkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.7 18.5c-5.3 0-8.4-3.7-8.5-9.8h2.7c.1 4.6 2.1 6.5 3.7 6.9V8.7h2.6v4.2c1.6-.2 3.2-2 3.8-4.2h2.6c-.4 2.7-2.2 4.5-3.5 5.3 1.3.6 3.4 2.2 4.2 5.2h-2.8c-.6-2-2.3-3.6-4.3-3.8v3.8h-.5Z" />
    </svg>
  );
}

export function Header({ group }: { group: Group }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <LogoTile />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-bold tracking-tight">{group.name}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {compact(group.members)} участников · живая лента сообщества
            </p>
          </div>
        </a>
        <a
          href={group.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-accent hover:text-accent-foreground"
        >
          <VkIcon className="size-4" />
          <span className="hidden sm:inline">ВКонтакте</span>
          <span className="sm:hidden">ВК</span>
        </a>
      </div>
    </header>
  );
}
