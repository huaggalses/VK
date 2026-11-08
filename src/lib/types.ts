/** Типы данных ленты — зеркалят нормализованный ответ VK API wall.get */
export interface Post {
  id: number;
  date: string; // ISO
  text: string;
  photos: string[];
  likes: number;
  reposts: number;
  comments: number;
  views: number;
  hashtags: string[];
  vkUrl: string;
  related: { id: number; title: string }[];
  pinned?: boolean; // пост, закреплённый в группе ВК (is_pinned из wall.get)
}

export interface PostChunk {
  page: number;
  pages: number;
  total: number;
  posts: Post[];
}

/**
 * Ссылка на закреплённый пост (public/data/pinned.json).
 * Храним и id, и сам пост: закреп не теряется, когда пост уезжает вниз ленты.
 */
export interface PinnedRef {
  postId: number | null;
  post: Post | null;
}

export interface Promo {
  advertiser: string;
  title: string;
  text: string;
  image: string;
  cta: string;
  url: string;
  erid: string;
}

export interface TopItem {
  rank: number;
  postId: number;
  title: string;
  image: string | null;
  score: number;
  likes: number;
  reposts: number;
  comments: number;
  vkUrl: string;
}

export interface Group {
  id: number;
  screenName: string;
  name: string;
  description: string;
  members: number;
  url: string;
}
