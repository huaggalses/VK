import { Music2 } from "lucide-react";
import type { PostAudio } from "@/lib/types";

/** Секунды → «3:05» */
const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Аудиозаписи из поста ВК. ВК не даёт встраивать свой аудиоплеер на
 * сторонние сайты, поэтому плашка — красивая ссылка на пост в ВК,
 * где трек воспроизводится штатно (открывается в новой вкладке).
 */
export function AudioList({
  audio,
  vkUrl,
}: {
  audio?: PostAudio[];
  vkUrl: string;
}) {
  if (!audio?.length) return null;

  return (
    <div className="flex flex-col gap-1.5 px-4 pb-4">
      {audio.map((a, i) => (
        <a
          key={`${a.artist}-${a.title}-${i}`}
          href={vkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border bg-muted/50 px-3 py-2.5 transition hover:border-violet-400 hover:bg-accent/50"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <Music2 className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {a.artist || "Аудиозапись"}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {(a.title || "Слушать в ВК") +
                (a.duration && a.duration > 0 ? ` · ${fmt(a.duration)}` : "")}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
            Слушать в ВК
          </span>
        </a>
      ))}
    </div>
  );
}
