import { Megaphone, ArrowRight } from "lucide-react";
import { withBase } from "@/lib/base-path";
import { compact } from "@/lib/format";
import type { Promo } from "@/lib/types";

/**
 * Промо-слот — первый платный продукт.
 * Градиентная рамка выделяет карточку, бейдж «Реклама» и ЕРИД — по закону.
 * Платного рекламодателя нет (promo.json = null) — слот не пустует:
 * вместо него показывается типовая карточка «Ваша реклама здесь».
 */
export function PromoCard({
  promo,
  members,
  adUrl,
}: {
  promo: Promo | null;
  members?: number;
  adUrl?: string;
}) {
  if (!promo) return <HousePromo members={members} adUrl={adUrl} />;
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

/**
 * Типовая карточка промо-слота — показывается, пока рекламодателя нет.
 * Это приглашение для рекламодателей (а не платная реклама третьих лиц),
 * поэтому без бейджа «Реклама» и ЕРИД: честно и по закону.
 * Двойная польза: посетитель видит, что место коммерческое,
 * а владелец группы — готовый витрина-аргумент в переговорах о цене.
 */
export function HousePromo({ members, adUrl }: { members?: number; adUrl?: string }) {
  return (
    <div className="fade-up rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-[1.5px] shadow-md shadow-fuchsia-500/10">
      <div className="rounded-[14.5px] bg-card px-5 py-7 text-center sm:py-9">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          <Megaphone className="size-3" />
          Рекламное место
        </span>

        <h2 className="mt-3 font-bold leading-snug tracking-tight sm:text-lg">
          Ваша реклама здесь
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Живая лента Тюмени: объявления, работа, события.{" "}
          {typeof members === "number" && members > 0
            ? `Ваше предложение увидят ${compact(members)} подписчиков группы.`
            : "Ваше предложение увидят тысячи жителей города."}
        </p>

        <a
          href={adUrl || "https://vk.ru/gim161610766"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow transition hover:opacity-90"
        >
          Разместить рекламу
          <ArrowRight className="size-4" />
        </a>

        <p className="mt-3.5 text-[10px] leading-relaxed text-muted-foreground">
          Место свободно — им может стать ваш бизнес.
        </p>
      </div>
    </div>
  );
}
