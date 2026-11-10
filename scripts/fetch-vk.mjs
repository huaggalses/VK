/**
 * Синхронизация сайта с группой ВК.
 *
 * Запускается перед каждой сборкой (локально или в GitHub Actions):
 *   VK_SERVICE_TOKEN=xxx VK_GROUP=online_tyumen72 node scripts/fetch-vk.mjs
 *
 * Что делает:
 *   1. group.json  — название, описание, участники, ссылка (из API, а без
 *      токена — из публичной страницы группы, это работает без логина).
 *   2. posts/page-*.json — нормализованные посты стены (текст, фото,
 *      лайки, репосты, комментарии, просмотры, is_pinned).
 *   3. top.json — «Топ недели»: лучшие посты за 7 дней по реакции.
 *   4. pinned.json — закреп: ручной закреп из панели сохраняется,
 *      иначе берётся пост с is_pinned из ВК.
 *
 * Без токена посты не трогаются — так случайный запуск в Actions без
 * секрета не может стереть данные. Токен: сервисный из standalone-приложения
 * (https://vk.com/editapp?create=), права не нужны — стена публичная.
 */

import fs from "fs";
import path from "path";

const GROUP = process.env.VK_GROUP || "online_tyumen72";
const TOKEN = (process.env.VK_SERVICE_TOKEN || "").trim();
const API = "https://api.vk.com/method";
const V = "5.199";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const DATA_DIR = path.join(process.cwd(), "public", "data");
const PAGE_SIZE = 10; // сколько постов в одном чанке ленты

const writeJson = (rel, data) => {
  const file = path.join(DATA_DIR, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  ✓ ${rel}`);
};

const log = (s) => console.log(s);

async function api(method, params) {
  const url = new URL(`${API}/${method}`);
  url.searchParams.set("v", V);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.error_code} — ${json.error.error_msg}`);
  return json.response;
}

/** Без токена: данные группы из HTML публичной страницы (apiPrefetchCache). */
async function scrapeGroup() {
  const res = await fetch(`https://vk.ru/${GROUP}`, {
    headers: { "User-Agent": UA, "Accept-Language": "ru" },
  });
  const html = await res.text();
  const m = html.match(/window\.cur\.apiPrefetchCache\s*=\s*(\[[\s\S]*?\]);\s*window\./);
  if (!m) throw new Error("Не удалось прочитать данные группы со страницы ВК");
  const cache = JSON.parse(m[1]);
  const hit = cache.find((c) => c.method === "groups.getById" && c.response?.groups?.[0]);
  if (!hit) throw new Error("В HTML страницы нет ответа groups.getById");
  return hit.response.groups[0];
}

const bestPhoto = (sizes) => {
  const pick = ["z", "y", "x", "r", "q", "p", "o"]; // 1280 → 807 → 604 → …
  for (const t of pick) {
    const hit = sizes?.find((s) => s.type === t && s.url);
    if (hit) return hit.url;
  }
  return sizes?.filter((s) => s.url).sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url ?? null;
};

/** Превью видео: берём самую крупную доступную картинку. */
const bestVideoImage = (v) =>
  v.photo_800 || v.photo_640 || v.photo_320 || v.photo_160 || null;

const hashtagsOf = (text) => {
  const tags = [...text.matchAll(/#([A-Za-zА-Яа-яЁё0-9_]+)/gu)].map((m) => m[1].toLowerCase());
  return [...new Set(tags)].slice(0, 6);
};

const titleOf = (text) => {
  const first = (text.split("\n").find((l) => l.trim()) ?? "").trim();
  return first.length > 64 ? `${first.slice(0, 61).trimEnd()}…` : first;
};

function normalizeWall(items) {
  return items
    .filter((p) => !p.marked_as_ads && typeof p.id === "number" && typeof p.from_id === "number")
    .map((p) => {
      // Видео и аудио из вложений: видео встраивается официальным плеером ВК,
      // аудио на чужих сайтах ВК не проигрывает — показываем плашку со ссылкой.
      const videos = [];
      const audios = [];
      for (const a of p.attachments ?? []) {
        if (
          a.type === "video" &&
          a.video &&
          typeof a.video.owner_id === "number" &&
          typeof a.video.id === "number"
        ) {
          videos.push({
            oid: a.video.owner_id,
            id: a.video.id,
            accessKey: a.video.access_key ?? null,
            title: (a.video.title ?? "").trim(),
            duration: a.video.duration ?? 0,
            image: bestVideoImage(a.video),
          });
        } else if (a.type === "audio" && a.audio) {
          audios.push({
            artist: (a.audio.artist ?? "").trim(),
            title: (a.audio.title ?? "").trim(),
            duration: a.audio.duration ?? 0,
          });
        }
      }

      return {
        id: p.id,
        date: new Date(p.date * 1000).toISOString(),
        text: (p.text ?? "").trim(),
        photos: (p.attachments ?? [])
          .filter((a) => a.type === "photo" && a.photo?.sizes)
          .map((a) => bestPhoto(a.photo.sizes))
          .filter(Boolean)
          .slice(0, 10),
        videos: videos.slice(0, 5),
        audio: audios.slice(0, 5),
        likes: p.likes?.count ?? 0,
        reposts: p.reposts?.count ?? 0,
        comments: p.comments?.count ?? 0,
        views: p.views?.count ?? 0,
        hashtags: hashtagsOf(p.text ?? ""),
        vkUrl: `https://vk.ru/wall${p.owner_id}_${p.id}`,
        related: [],
        pinned: Boolean(p.is_pinned),
      };
    });
}

function chunkAndWrite(posts) {
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  for (let i = 0; i < pages; i++) {
    writeJson(`posts/page-${i + 1}.json`, {
      page: i + 1,
      pages,
      total: posts.length,
      posts: posts.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE),
    });
  }
  // убрать лишние чанки, если раньше их было больше
  for (let i = pages + 1; i <= 40; i++) {
    const f = path.join(DATA_DIR, "posts", `page-${i}.json`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  return pages;
}

function buildTop(posts) {
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  let pool = posts.filter((p) => new Date(p.date).getTime() >= weekAgo);
  if (pool.length < 3) pool = posts; // мало постов за неделю — берём из всего загруженного
  const items = pool
    .map((p) => ({
      p,
      score: p.likes + p.reposts * 2 + p.comments * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ p, score }, i) => ({
      rank: i + 1,
      postId: p.id,
      title: titleOf(p.text) || "Пост без текста",
      image: p.photos[0] ?? null,
      score,
      likes: p.likes,
      reposts: p.reposts,
      comments: p.comments,
      vkUrl: p.vkUrl,
    }));
  writeJson("top.json", { period: "Неделя", items });
}

function buildPinned(newPosts) {
  let manual = null;
  try {
    manual = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "pinned.json"), "utf8"));
  } catch {
    /* файла не было — не страшно */
  }
  // 1) ручной закреп из панели админа, если пост ещё существует
  if (manual?.postId) {
    const found = newPosts.find((p) => p.id === manual.postId);
    if (found) {
      writeJson("pinned.json", { postId: found.id, post: { ...found, pinned: true } });
      return;
    }
    log(`  ⚠️ закреплённый вручную пост #${manual.postId} больше не в ленте — снимаем`);
  }
  // 2) пост с is_pinned из самой группы ВК
  const vkPinned = newPosts.find((p) => p.pinned);
  if (vkPinned) {
    writeJson("pinned.json", { postId: vkPinned.id, post: { ...vkPinned, pinned: true } });
    return;
  }
  writeJson("pinned.json", { postId: null, post: null });
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  log(`Группа: vk.ru/${GROUP}${TOKEN ? " (через VK API)" : " (без токена)"}`);

  // ── Шаг 1: группа ──────────────────────────────────────────────────────
  let g;
  if (TOKEN) {
    const r = await api("groups.getById", {
      group_id: GROUP,
      fields: "members_count,description,screen_name,status",
    });
    g = r.groups[0];
  } else {
    g = await scrapeGroup();
  }
  const group = {
    id: g.id,
    screenName: g.screen_name ?? GROUP,
    name: g.name,
    description: (g.description || g.status || "").trim(),
    members: g.members_count ?? 0,
    url: `https://vk.ru/${g.screen_name ?? GROUP}`,
  };
  writeJson("group.json", group);
  log(`  «${group.name}» — ${group.members.toLocaleString("ru-RU")} участников`);

  // ── Шаг 2: посты (только с токеном) ───────────────────────────────────
  if (!TOKEN) {
    log("  ⚠️ VK_SERVICE_TOKEN не задан — посты и топ не обновлены (остались прежние).");
    log("     Как получить токен: README-GITHUB-PAGES.md → «Подключение группы ВК».");
    return;
  }

  const wall = await api("wall.get", { domain: GROUP, count: 60, filter: "owner" });
  const posts = normalizeWall(wall.items);
  log(`  ✓ получено постов: ${posts.length} (всего на стене: ${wall.count})`);
  if (posts.length === 0) throw new Error("wall.get вернул 0 постов — проверьте группу");

  chunkAndWrite(posts);
  buildTop(posts);
  buildPinned(posts);
  log("Готово: данные обновлены.");
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
