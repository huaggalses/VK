import fs from "fs";
import path from "path";
import type { Group, PostChunk, Promo, PinnedRef, TopItem } from "./types";

/**
 * Чтение статичных JSON-чанков из public/data.
 * В продакшене эти файлы перегенерирует GitHub Action при каждой сборке,
 * поэтому на сайте не нужен ни сервер, ни БД — ровно как на GitHub Pages.
 */
const DATA_DIR = path.join(process.cwd(), "public", "data");

function read<T>(rel: string): T {
  const raw = fs.readFileSync(path.join(DATA_DIR, rel), "utf8");
  return JSON.parse(raw) as T;
}

export const getGroup = () => read<Group>("group.json");
export const getPromo = () => read<Promo>("promo.json");
export const getRecommend = () => read<Promo>("recommend.json");
export const getTop = () =>
  read<{ period: string; items: TopItem[] }>("top.json");
export const getFirstChunk = () => read<PostChunk>("posts/page-1.json");

/**
 * Закреплённый пост — первая карточка ленты.
 * В pinned.json лежит и id, и сам пост; если поста в файле нет (старый формат),
 * ищем по id в чанках ленты. Порядок похожести на ВК: закреп всегда сверху.
 */
export function getPinned(): PinnedRef["post"] {
  let ref: PinnedRef;
  try {
    ref = read<PinnedRef>("pinned.json");
  } catch {
    return null; // файла нет — закрепа просто нет
  }
  if (ref.post) return { ...ref.post, pinned: true };
  if (!ref.postId) return null;
  for (let page = 1; page < 500; page++) {
    const file = path.join(DATA_DIR, "posts", `page-${page}.json`);
    if (!fs.existsSync(file)) break;
    try {
      const chunk = JSON.parse(fs.readFileSync(file, "utf8")) as PostChunk;
      const hit = chunk.posts.find((p) => p.id === ref.postId);
      if (hit) return { ...hit, pinned: true };
    } catch {
      break;
    }
  }
  return null;
}
