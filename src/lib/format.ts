import { formatDistanceToNowStrict } from "date-fns";
import { ru } from "date-fns/locale";

/** Форматирование чисел и дат — детерминированно для SSR и клиента */

/** 21400 → «21,4 тыс.», 8900 → «8,9 тыс.» */
export function compact(n: number): string {
  if (n < 1000) return String(n);
  return new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** «2 часа назад» — считается от ISO-даты поста */
export function relativeDate(iso: string): string {
  try {
    return `${formatDistanceToNowStrict(new Date(iso), { locale: ru })} назад`;
  } catch {
    return new Date(iso).toLocaleDateString("ru-RU");
  }
}

/** Абсолютная дата для подсказки: «7 ноября, 14:20» */
export function absoluteDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
