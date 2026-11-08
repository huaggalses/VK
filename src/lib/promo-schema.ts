import { z } from "zod";

/**
 * Схема рекламного поста — единый контракт между панелью админа (/admin)
 * и JSON-файлом, который она публикует в репозиторий (public/data/promo.json).
 */
export const promoSchema = z.object({
  advertiser: z
    .string()
    .trim()
    .min(2, "Укажите название рекламодателя")
    .max(80, "Не длиннее 80 символов"),
  title: z
    .string()
    .trim()
    .min(4, "Слишком короткий заголовок")
    .max(120, "Не длиннее 120 символов"),
  text: z
    .string()
    .trim()
    .min(10, "Опишите предложение подробнее (от 10 символов)")
    .max(400, "Не длиннее 400 символов"),
  cta: z
    .string()
    .trim()
    .min(2, "Подпишите кнопку")
    .max(30, "Не длиннее 30 символов"),
  url: z
    .string()
    .trim()
    .min(1, "Укажите ссылку перехода")
    .refine(
      (v) => /^https?:\/\/\S+\.\S+/.test(v),
      "Ссылка должна быть полной: https://example.com",
    ),
  erid: z
    .string()
    .trim()
    .min(1, "ЕРИД обязателен — его выдаёт ОРД (для нерекламных анонсов поставьте «—»)")
    .max(60, "Не длиннее 60 символов"),
  image: z.string().trim().min(1, "Добавьте картинку или укажите путь к файлу"),
});

export type PromoForm = z.infer<typeof promoSchema>;

/** Ошибки валидации в виде { поле: сообщение } — для показа под инпутами. */
export function fieldErrorsOf(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (result.success || !result.error) return out;
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Транслитерация кириллицы — для имён файлов картинок в репозитории. */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "promo";
}

/** Короткий детерминированный хэш — в имени файла работает как кэш-бастер. */
export function hash6(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(7, "0").slice(0, 6);
}

/** Префикс basePath (нужен на GitHub Pages для проектных сайтов). */
export function joinBasePath(base: string, p: string): string {
  const b = base.trim();
  if (!b) return p;
  return `${b.replace(/\/+$/, "")}${p.startsWith("/") ? p : `/${p}`}`.replace(/\/{2,}/g, "/");
}

/**
 * Картинка с диска → JPEG dataURL.
 * Большие фото сжимаются до maxWidth по ширине, качество 0.85 —
 * репозиторий и Pages остаются лёгкими.
 */
export async function fileToJpegDataUrl(file: File, maxWidth = 1200): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Это не изображение — выберите JPG, PNG или WebP.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Файл больше 12 МБ — выберите картинку поменьше.");
  }

  const readAsDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
      reader.readAsDataURL(file);
    });

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return await readAsDataUrl();
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    // Браузер без createImageBitmap — отдаём оригинал как есть.
    return await readAsDataUrl();
  }
}

/** UTF-8-безопасный base64 для GitHub Contents API (JSON с кириллицей). */
export function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
