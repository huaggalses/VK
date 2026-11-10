"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { withBase } from "@/lib/base-path";
import type { PostVideo } from "@/lib/types";

/** Секунды → «3:05» */
const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Видео из поста ВК: в ленте — превью-картинка с кнопкой ▶ (лента не грузит
 * лишний JS), по клику — официальный плеер ВК в iframe.
 * Как в ВК: плеер открывается на превью-кадре, воспроизведение запускает
 * пользователь кнопкой плеера (без внезапного звука).
 * Обёртка aspect-video адаптирует плеер под любую ширину карточки.
 */
export function VideoPlayer({ video, postId }: { video: PostVideo; postId: number }) {
  const [playing, setPlaying] = useState(false);

  const src =
    `https://vk.com/video_ext.php?oid=${video.oid}&id=${video.id}` +
    `${video.accessKey ? `&access_key=${video.accessKey}` : ""}&hd=2`;

  return (
    <div className="px-4 pb-4">
      <div className="overflow-hidden rounded-xl border bg-black">
        {playing ? (
          <div className="aspect-video w-full">
            <iframe
              src={src}
              title={`Видео к посту ${postId}`}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Смотреть видео к посту ${postId}`}
            className="group relative block aspect-video w-full cursor-pointer focus:outline-none"
          >
            {video.image ? (
              <img
                src={withBase(video.image)}
                alt={`Превью видео к посту ${postId}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <span className="block h-full w-full bg-muted" />
            )}
            <span className="absolute inset-0 bg-black/30 transition group-hover:bg-black/15" />
            <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-xl transition group-hover:scale-105">
              <Play className="ml-1 size-8 fill-black text-black" />
            </span>
            {!!video.duration && video.duration > 0 && (
              <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                {fmt(video.duration)}
              </span>
            )}
          </button>
        )}
      </div>
      {video.title && (
        <p className="mt-1.5 truncate text-[13px] font-medium leading-snug text-muted-foreground">
          {video.title}
        </p>
      )}
    </div>
  );
}
