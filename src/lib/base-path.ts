/**
 * Префикс, если сайт живёт в подкаталоге домена (username.github.io/репозиторий).
 *
 * В GitHub Actions workflow сам определяет имя репозитория и передаёт его
 * в сборку через NEXT_PUBLIC_BASE_PATH (вместе с NEXT_BASE_PATH для Next.js) —
 * значение вшивается в клиентский код в момент сборки. Локально и на личной
 * странице username.github.io префикс пустой.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

/**
 * Добавляет префикс к локальным путям (/data/..., /img/...).
 * Абсолютные URL (фото из CDN ВК, data:) и пустые строки не трогает,
 * повторное добавление уже существующего префикса невозможен — функция
 * безопасна для любых источников данных.
 */
export function withBase(pathname: string): string {
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) return pathname;
  if (BASE_PATH && (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`))) {
    return pathname;
  }
  return `${BASE_PATH}${pathname}`;
}
