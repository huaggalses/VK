/**
 * Разовая диагностика: сколько на стене постов с видео/аудио.
 * Ничего не меняет, только печатает статистику в лог Actions.
 */
const GROUP = "online_tyumen72";
const TOKEN = process.env.VK_SERVICE_TOKEN.trim();
const V = "5.199";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

async function api(method, params) {
  const url = new URL(`https://api.vk.com/method/${method}`);
  url.searchParams.set("v", V);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.error_code} — ${json.error.error_msg}`);
  return json.response;
}

const wall = await api("wall.get", { domain: GROUP, count: 100, filter: "owner", offset: 0 });
const total = wall.count;
console.log(`всего на стене: ${total}`);

const DEPTH = Math.min(500, total);
const items = [...wall.items];
for (let off = 100; off < DEPTH; off += 100) {
  const r = await api("wall.get", { domain: GROUP, count: 100, filter: "owner", offset: off });
  items.push(...r.items);
}
console.log(`просканировано последних ${items.length} постов`);

let postsV = 0, postsA = 0, examplesV = [], examplesA = [];
for (const p of items) {
  if (p.marked_as_ads) continue;
  const atts = p.attachments ?? [];
  const vids = atts.filter((a) => a.type === "video");
  const auds = atts.filter((a) => a.type === "audio");
  if (vids.length) {
    postsV++;
    const d = new Date(p.date * 1000).toISOString().slice(0, 10);
    examplesV.push(`  ${d} wall${p.owner_id}_${p.id}: видео ×${vids.length} — ${(p.text || "").slice(0, 50).replace(/\n/g, " ")}`);
  }
  if (auds.length) {
    postsA++;
    const d = new Date(p.date * 1000).toISOString().slice(0, 10);
    examplesA.push(`  ${d} wall${p.owner_id}_${p.id}: аудио ×${auds.length} — ${auds[0].audio?.artist ?? ""} «${auds[0].audio?.title ?? ""}»`);
  }
}
console.log(`\n=== ИТОГ по последним ${items.length} постам ===`);
console.log(`постов с ВИДЕО: ${postsV}`);
console.log(`постов с АУДИО: ${postsA}`);
if (examplesV.length) console.log(`\nпримеры видео-постов:\n${examplesV.slice(0, 10).join("\n")}`);
if (examplesA.length) console.log(`\nпримеры аудио-постов:\n${examplesA.slice(0, 10).join("\n")}`);
if (!postsV && !postsA) console.log("\nв этих постах видео и аудио нет вовсе — только фото и текст");
