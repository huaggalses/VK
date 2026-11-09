import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { PromoCard } from "@/components/site/promo-card";
import { PostCard } from "@/components/site/post-card";
import { InfiniteFeed } from "@/components/site/infinite-feed";
import { TopWeek } from "@/components/site/top-week";
import { RecommendCard } from "@/components/site/recommend-card";
import { AdCta } from "@/components/site/ad-cta";
import { getFirstChunk, getGroup, getPinned, getPromo, getRecommend, getTop } from "@/lib/feed";

export default function Home() {
  const group = getGroup();
  const pinned = getPinned();
  // Закреп показан отдельной первой карточкой — из чанка его убираем,
  // чтобы при докрутке ленты он не встретился второй раз.
  const rawFirst = getFirstChunk();
  const first = pinned
    ? { ...rawFirst, posts: rawFirst.posts.filter((p) => p.id !== pinned.id) }
    : rawFirst;
  const promo = getPromo();
  const rec = getRecommend();
  const top = getTop();

  return (
    <div className="flex min-h-screen flex-col">
      <Header group={group} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 pt-5 sm:px-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
          <div className="min-w-0 space-y-5">
            <PromoCard promo={promo} />
            {pinned && <PostCard post={pinned} groupName={group.name} />}
            <InfiniteFeed
              first={first}
              groupName={group.name}
              groupUrl={group.url}
              excludeId={pinned?.id}
              topSlot={
                <div key="top-slot" className="lg:hidden">
                  <TopWeek period={top.period} items={top.items} />
                </div>
              }
              recSlot={
                <div key="rec-slot" className="lg:hidden">
                  <RecommendCard rec={rec} />
                </div>
              }
            />
            <div className="lg:hidden">
              <AdCta />
            </div>
          </div>

          {/* Правая колонка листается вместе с лентой (как в ВК),
              без sticky — иначе нижние карточки не добраться до низа */}
          <aside className="hidden space-y-5 lg:block">
            <TopWeek period={top.period} items={top.items} />
            <RecommendCard rec={rec} />
            <AdCta />
          </aside>
        </div>
      </main>

      <Footer group={group} />
    </div>
  );
}
