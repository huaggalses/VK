"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { PartyPopper, RefreshCw, Loader2 } from "lucide-react";
import { PostCard } from "./post-card";
import { Button } from "@/components/ui/button";
import { withBase } from "@/lib/base-path";
import type { Post, PostChunk } from "@/lib/types";

type Status = "idle" | "loading" | "done" | "error";

/**
 * Главный интерактивный «остров» сайта: бесконечная лента.
 * Всё остальное — статичный HTML без JS. Здесь — подгрузка
 * заранее нарезанных JSON-чанков (ровно как будет на GitHub Pages).
 */
export function InfiniteFeed({
  first,
  groupName,
  groupUrl,
  excludeId,
  topSlot,
  recSlot,
}: {
  first: PostChunk;
  groupName: string;
  groupUrl: string;
  excludeId?: number; // id закреплённого поста: он показан отдельной карточкой выше, в ленте его пропускаем
  topSlot?: React.ReactNode;
  recSlot?: React.ReactNode;
}) {
  const [posts, setPosts] = useState<Post[]>(first.posts);
  const [status, setStatus] = useState<Status>("idle");
  const pageRef = useRef(first.page);
  const busyRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { pages, total } = first;

  const loadMore = useCallback(async () => {
    if (busyRef.current) return;
    const next = pageRef.current + 1;
    if (next > pages) return;
    busyRef.current = true;
    setStatus("loading");
    try {
      const res = await fetch(withBase(`/data/posts/page-${next}.json`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const chunk: PostChunk = await res.json();
      pageRef.current = chunk.page;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...chunk.posts.filter((p) => !seen.has(p.id) && p.id !== excludeId)];
      });
      setStatus(pageRef.current >= pages ? "done" : "idle");
    } catch {
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }, [pages, excludeId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !busyRef.current && pageRef.current < pages) {
          loadMore();
        }
      },
      { rootMargin: "700px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, pages, status]);

  return (
    <div className="space-y-5">
      {posts.map((post, i) => (
        <Fragment key={post.id}>
          <PostCard post={post} groupName={groupName} />
          {i === 1 && topSlot ? <Fragment key="slot-top">{topSlot}</Fragment> : null}
          {i === 4 && recSlot ? <Fragment key="slot-rec">{recSlot}</Fragment> : null}
        </Fragment>
      ))}

      {status === "loading" && <FeedSkeleton />}

      {status === "error" && (
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="text-sm font-semibold">Не удалось подгрузить посты</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Проверьте соединение — лента продолжится с того же места.
          </p>
          <Button onClick={loadMore} className="mt-4 rounded-full" size="sm">
            <RefreshCw className="size-4" />
            Загрузить ещё
          </Button>
        </div>
      )}

      {status === "done" && (
        <div className="fade-up rounded-2xl border bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 p-6 text-center">
          <PartyPopper className="mx-auto size-7 text-violet-500" />
          <p className="mt-2 font-bold">Вы долистали до конца</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Все {total} постов в ленте. Самые свежие — уже в группе ВК.
          </p>
          <Button asChild className="mt-4 rounded-full" size="sm">
            <a href={groupUrl} target="_blank" rel="noopener noreferrer">
              Открыть группу ВК
            </a>
          </Button>
        </div>
      )}

      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border bg-card p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-muted" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="h-2.5 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-4/5 rounded bg-muted" />
      <div className="aspect-[16/9] w-full rounded-xl bg-muted" />
    </div>
  );
}
