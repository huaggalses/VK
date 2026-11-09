import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";

/**
 * Сетка фотографий поста, как в ВК: 1 фото — во всю ширину,
 * 2 — рядом, 3 — большое сверху и два снизу.
 * Главное (единственное) фото не обрезается: оно автоматически
 * подстраивается под свои пропорции и занимает всю ширину карточки,
 * очень высокие фото ограничены по высоте, чтобы не растягивать ленту.
 */
export function PhotoGrid({ photos, postId }: { photos: string[]; postId: number }) {
  if (photos.length === 0) return null;

  const single = photos.length === 1;

  return (
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
        </div>
      ))}
    </div>
  );
}
