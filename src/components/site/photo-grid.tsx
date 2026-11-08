import { cn } from "@/lib/utils";
import { withBase } from "@/lib/base-path";

/**
 * Сетка фотографий поста, как в ВК: 1 фото — во всю ширину,
 * 2 — рядом, 3 — большое сверху и два снизу.
 */
export function PhotoGrid({ photos, postId }: { photos: string[]; postId: number }) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-1.5 px-4 pb-4">
      {photos.map((src, i) => (
        <div
          key={src}
          className={cn(
            "overflow-hidden rounded-xl border bg-muted",
            photos.length === 1 && "col-span-2 aspect-[16/9] sm:aspect-[2/1]",
            photos.length === 2 && "aspect-[4/3]",
            photos.length >= 3 && (i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]")
          )}
        >
          <img
            src={withBase(src)}
            alt={`Фото ${i + 1} к посту ${postId}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
          />
        </div>
      ))}
    </div>
  );
}
