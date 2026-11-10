import { Heart, MessageCircle, Repeat2, Eye, ExternalLink, Pin } from "lucide-react";
import { LogoTile } from "./logo";
import { PhotoGrid } from "./photo-grid";
import { VideoPlayer } from "./video-player";
import { AudioList } from "./audio-list";
import { compact, relativeDate, absoluteDate } from "@/lib/format";
import type { Post } from "@/lib/types";

/**
 * Карточка поста: чистый HTML без клиентского JS.
 * Дата рендерится относительной, полный текст — без «показать ещё».
 * Порядок как в ВК: сначала фотографии, под ними текст.
 * Если у поста нет фото — остаётся просто текст; нет текста — просто фото.
 */
export function PostCard({ post, groupName }: { post: Post; groupName: string }) {
  return (
    <article
      id={`post-${post.id}`}
      className="fade-up scroll-mt-20 overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/5"
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-4">
        <LogoTile className="size-9 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{groupName}</p>
          <div className="flex items-center gap-2">
            <time
              dateTime={post.date}
              title={absoluteDate(post.date)}
              suppressHydrationWarning
              className="text-xs text-muted-foreground"
            >
              {relativeDate(post.date)}
            </time>
            {post.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                <Pin className="size-3" />
                Закреплено
              </span>
            )}
          </div>
        </div>
      </div>

      <PhotoGrid photos={post.photos} postId={post.id} />

      {/* Видео: официальный плеер ВК, играющий прямо на сайте */}
      {(post.videos?.length ?? 0) > 0 &&
        post.videos!.map((v, i) => (
          <VideoPlayer key={`${v.oid}_${v.id}_${i}`} video={v} postId={post.id} />
        ))}

      {/* Аудио: плашка со ссылкой — ВК не разрешает внешнее воспроизведение */}
      <AudioList audio={post.audio} vkUrl={post.vkUrl} />

      {post.text && (
        <p className="whitespace-pre-line px-4 py-3 text-[15px] leading-relaxed">
          {post.text}
        </p>
      )}

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3.5">
          {post.hashtags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {post.related.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 text-xs text-muted-foreground">
          <span>Ещё по теме:</span>
          {post.related.map((r) => (
            <a
              key={r.id}
              href={`#post-${r.id}`}
              className="rounded-full border px-2.5 py-1 transition hover:border-violet-400 hover:text-foreground"
            >
              {r.title}
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-3.5 text-muted-foreground sm:gap-4">
          <span className="flex items-center gap-1.5 text-[13px]">
            <Heart className="size-4" />
            {compact(post.likes)}
          </span>
          <span className="flex items-center gap-1.5 text-[13px]">
            <MessageCircle className="size-4" />
            {compact(post.comments)}
          </span>
          <span className="flex items-center gap-1.5 text-[13px]">
            <Repeat2 className="size-4" />
            {compact(post.reposts)}
          </span>
          <span className="flex items-center gap-1.5 text-[13px]">
            <Eye className="size-4" />
            {compact(post.views)}
          </span>
        </div>
        <a
          href={post.vkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-foreground transition hover:bg-accent"
        >
          Открыть в ВК
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </article>
  );
}
