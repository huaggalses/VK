import { Flame, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";
import type { TopItem } from "@/lib/types";

/**
 * «Топ недели» — честный рейтинг, считается автоматически
 * при сборке из статистики ВК: лайки + 2×репосты + 3×комментарии.
 */
export function TopWeek({ period, items }: { period: string; items: TopItem[] }) {
  return (
    <section className="fade-up rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-500 to-fuchsia-500 text-white shadow">
          <Flame className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-tight">Топ {period.toLowerCase()}</h3>
          <p className="text-xs leading-tight text-muted-foreground">
            лайки, репосты и комментарии вместе
          </p>
        </div>
      </div>

      <ol className="mt-3 space-y-1">
        {items.map((t) => (
          <li key={t.postId}>
            <a
              href={`#post-${t.postId}`}
              className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent/60"
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  t.rank <= 3
                    ? "bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {t.rank}
              </span>
              {t.image ? (
                <img
                  src={withBase(t.image)}
                  alt=""
                  loading="lazy"
                  className="size-11 shrink-0 rounded-lg border object-cover"
                />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-lg border bg-secondary/60 text-muted-foreground">
                  <Newspaper className="size-4" />
                </span>
              )}
              <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-snug">
                {t.title}
              </span>
              <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {t.score}
              </span>
            </a>
          </li>
        ))}
      </ol>

      <p className="mt-2.5 border-t pt-2.5 text-[10px] leading-relaxed text-muted-foreground">
        Считается автоматически при сборке из статистики ВК — без ручного выбора
      </p>
    </section>
  );
}
