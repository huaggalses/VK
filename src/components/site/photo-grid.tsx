"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";

/**
 * Сетка фотографий поста, как в ВК: 1 фото — во всю ширину,
 * 2 — рядом, 3 — большое сверху и два снизу.
 * Главное (единственное) фото не обрезается: оно автоматически
 * подстраивается под свои пропорции и занимает всю ширину карточки,
 * очень высокие фото ограничены по высоте, чтобы не растягивать ленту.
 *
 * Клик по фото открывает лайтбокс — просмотр на весь экран:
 * фото подгоняется под размер экрана (адаптивно), есть стрелки,
 * свайп влево/вправо на телефоне, счётчик и закрытие по Esc,
 * клику мимо фото или крестику.
 */
export function PhotoGrid({ photos, postId }: { photos: string[]; postId: number }) {
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  const close = () => setOpen(null);
  const prev = () => setOpen((v) => (v !== null && v > 0 ? v - 1 : v));
  const next = () =>
    setOpen((v) => (v !== null && v < photos.length - 1 ? v + 1 : v));

  // Блокируем прокрутку страницы, пока открыт просмотр, и слушаем клавиатуру
  const isOpen = open !== null;
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, photos.length]);

  if (photos.length === 0) return null;

  const single = photos.length === 1;

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 px-4 pb-4">
        {photos.map((src, i) => (
          <div
            key={src}
            className={cn(
              "overflow-hidden rounded-xl border bg-muted",
              single && "col-span-2",
              photos.length === 2 && "aspect-[4/3]",
              photos.length >= 3 && (i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]")
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Открыть фото ${i + 1} к посту ${postId}`}
              className="block h-full w-full cursor-zoom-in focus:outline-none"
            >
              <img
                src={withBase(src)}
                alt={`Фото ${i + 1} к посту ${postId}`}
                loading="lazy"
                className={cn(
                  "transition duration-500 hover:scale-[1.03]",
                  single
                    ? "h-auto max-h-[600px] w-full object-contain"
                    : "h-full w-full object-cover"
                )}
              />
            </button>
          </div>
        ))}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фотографии"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-8"
          onClick={close}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null || open === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) < 50) return;
            if (dx < 0) next();
            else prev();
          }}
        >
          {/* Крестик — закрыть */}
          <button
            type="button"
            onClick={close}
            aria-label="Закрыть просмотр"
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Стрелка — предыдущее фото */}
          {open > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 sm:left-4 sm:h-12 sm:w-12"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          {/* Само фото — подгоняется под любой экран */}
          <img
            src={withBase(photos[open])}
            alt={`Фото ${open + 1} к посту ${postId}`}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-full select-none rounded-lg object-contain shadow-2xl"
          />

          {/* Стрелка — следующее фото */}
          {open < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 sm:right-4 sm:h-12 sm:w-12"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {/* Счётчик фото */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur">
              {open + 1} / {photos.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
