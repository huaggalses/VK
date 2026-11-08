import { Megaphone, ArrowRight } from "lucide-react";
import { withBase } from "@/lib/base-path";
import type { Promo } from "@/lib/types";

/**
 * Промо-слот — первый платный продукт.
 * Градиентная рамка выделяет карточку, бейдж «Реклама» и ЕРИД — по закону.
 */
export function PromoCard({ promo }: { promo: Promo | null }) {
  if (!promo) return null; // блок снят (promo.json = null) — просто не рисуем
  return (
    <div className="fade-up rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-[1.5px] shadow-md shadow-fuchsia-500/10">
      <div className="rounded-[14.5px] bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            <Megaphone className="size-3" />
            Реклама
          </span>
          <span className="text-[10px] text-muted-foreground">ЕРИД: {promo.erid}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
          <div className="overflow-hidden rounded-xl border">
            <img
              src={withBase(promo.image)}
              alt={`Реклама: ${promo.advertiser}`}
              className="aspect-[16/10] w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {promo.advertiser}
            </p>
            <h2 className="mt-1 font-bold leading-snug tracking-tight">{promo.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{promo.text}</p>
            <a
              href={promo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow transition hover:opacity-90"
            >
              {promo.cta}
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>

        <p className="mt-3.5 border-t pt-2.5 text-[10px] leading-relaxed text-muted-foreground">
          Партнёрский материал · размечен как реклама, токен ЕРИД передаётся через ОРД
        </p>
      </div>
    </div>
  );
}
