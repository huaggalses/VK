import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";

/**
 * Служебная страница: загрузка рекламного поста в слоты ленты.
 * Закрыта от индексации (мета + robots.txt) — для поисковиков это служебка.
 */
export const metadata: Metadata = {
  title: "Панель рекламодателя — Наш Город",
  description: "Служебная страница: загрузка рекламного поста в ленту сообщества.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
