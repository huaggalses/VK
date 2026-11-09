import Link from "next/link";
import type { Group } from "@/lib/types";

export function Footer({ group }: { group: Group }) {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
        <p>
          © {new Date().getFullYear()} «{group.name}» · все посты — из группы ВК ·{" "}
          <Link
            href="/admin"
            className="transition hover:text-foreground"
            title="Панель рекламодателя"
          >
            вход для редактора
          </Link>
        </p>
        <p className="hidden md:block">
          Обновление ленты — раз в 45 минут · статика для GitHub Pages
        </p>
        {/* Кнопка ведёт в сообщения сообщества VK */}
        <a
          href="https://vk.ru/gim161610766"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground underline-offset-4 transition hover:underline"
        >
          Разместить рекламу
        </a>
      </div>
    </footer>
  );
}
