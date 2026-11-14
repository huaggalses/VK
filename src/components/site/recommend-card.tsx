import { Handshake, Send } from "lucide-react";
import { withBase } from "@/lib/base-path";
import { compact } from "@/lib/format";
import type { Promo } from "@/lib/types";

/**
 * «Рекомендуем» — второй платный слот, мягче промо-закрепа.
 * Помечен как реклама: честность важнее охвата.
 * Платного партнёра нет (recommend.json = null) — слот не пустует:
 * вместо него показывается типовая карточка «Подать объявление».
 */
export function RecommendCard({
  rec,
  groupUrl,
  members,
}: {
  rec: Promo | null;
  groupUrl?: string;
  members?: number;
}) {
  if (!rec) return <HouseRecommend groupUrl={groupUrl} members={members} />;
  return (
    <section className="fade-up overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2.5 p-4 pb-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow">
          <Handshake className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight">Рекомендуем</h3>
          <p className="text-xs leading-tight text-muted-foreground">партнёры сообщества</p>
        </div>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Реклама
        </span>
      </div>

      <img
        src={withBase(rec.image)}
        alt={`Рекомендуем: ${rec.advertiser}`}
        loading="lazy"
        className="aspect-[16/9] w-full object-cover"
      />

      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {rec.advertiser}
        </p>
        <p className="mt-1 text-sm font-bold">{rec.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{rec.text}</p>
        <a
          href={rec.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-10 w-full items-center justify-center rounded-full border-2 border-violet-500/60 text-sm font-semibold text-foreground transition hover:bg-violet-500/10"
        >
          {rec.cta}
        </a>
        <p className="mt-2 text-[10px] text-muted-foreground">ЕРИД: {rec.erid}</p>
      </div>
    </section>
  );
}

/**
 * Типовая карточка слота «Рекомендуем» — показывается, пока нет платного партнёра.
 * Это не реклама третьих лиц, а сервис самого сообщества: приглашение бесплатно
 * подать объявление. Посетитель получает полезный призыв, слот не выглядит пустым.
 */
export function HouseRecommend({ groupUrl, members }: { groupUrl?: string; members?: number }) {
  return (
    <section className="fade-up overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2.5 p-4 pb-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow">
          <Send className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold leading-tight">Подать объявление</h3>
          <p className="text-xs leading-tight text-muted-foreground">бесплатно · сервис группы</p>
        </div>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Сервис группы
        </span>
      </div>

      <div className="px-4 pb-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Продавайте ненужное быстро и без комиссий: объявление увидят{" "}
          {typeof members === "number" && members > 0
            ? `${compact(members)} подписчиков группы`
            : "тысячи жителей Тюмени"}
          , и оно появится на этом сайте в тот же день.
        </p>
        <a
          href={groupUrl || "https://vk.ru/online_tyumen72"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex h-10 w-full items-center justify-center rounded-full border-2 border-violet-500/60 text-sm font-semibold text-foreground transition hover:bg-violet-500/10"
        >
          Написать в группу
        </a>
      </div>
    </section>
  );
}
