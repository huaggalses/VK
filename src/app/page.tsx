import { Header } from "@/components/site/header";
import { PostCard } from "@/components/site/post-card";
import { InfiniteFeed } from "@/components/site/infinite-feed";
import { getFirstChunk, getGroup, getPinned } from "@/lib/feed";

/**
 * Минималистичная версия: только лента постов, как в ВК.
 * Рекламные блоки (PromoCard, RecommendCard, AdCta), «Топ недели» (TopWeek)
 * и подвал (Footer) убраны — компоненты и админка (/admin) остались в проекте,
 * чтобы блоки можно было вернуть в любой момент.
 */
export default function Home() {
  const group = getGroup();
  const pinned = getPinned();
  // Закреп показан отдельной первой карточкой — из чанка его убираем,
  // чтобы при докрутке ленты он не встретился второй раз.
  const rawFirst = getFirstChunk();
  const first = pinned
    ? { ...rawFirst, posts: rawFirst.posts.filter((p) => p.id !== pinned.id) }
    : rawFirst;

  return (
    <div className="flex min-h-screen flex-col">
      <Header group={group} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-14 pt-5 sm:px-6">
        <div className="space-y-5">
          {pinned && <PostCard post={pinned} groupName={group.name} />}
          <InfiniteFeed
            first={first}
            groupName={group.name}
            groupUrl={group.url}
            excludeId={pinned?.id}
          />
        </div>
      </main>
    </div>
  );
}
