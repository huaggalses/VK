import { Megaphone } from "lucide-react";

/** Продажа слота: карта для потенциальных рекламодателей */
export function AdCta() {
  return (
    <section className="fade-up rounded-2xl border-2 border-dashed border-violet-500/40 bg-violet-500/[0.04] p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow">
          <Megaphone className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold">Хочешь так же?</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Промо-слот вверху ленты, блок «Рекомендуем» или пакет с закрепом и историей
            в ВК — напишите, подберём формат под вашу задачу.
          </p>
          <a
            href="https://vk.ru/gim161610766"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-9 items-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 text-[13px] font-semibold text-white shadow transition hover:opacity-90"
          >
            Разместить рекламу
          </a>
        </div>
      </div>
    </section>
  );
}
