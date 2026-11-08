"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Handshake,
  ImagePlus,
  Loader2,
  Lock,
  LogOut,
  Megaphone,
  Pin,
  PlugZap,
  RefreshCw,
  Rocket,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { PromoCard } from "@/components/site/promo-card";
import { RecommendCard } from "@/components/site/recommend-card";
import { PostCard } from "@/components/site/post-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Post, PostChunk, Promo, PinnedRef } from "@/lib/types";
import {
  fileToJpegDataUrl,
  fieldErrorsOf,
  hash6,
  joinBasePath,
  promoSchema,
  slugify,
  utf8ToBase64,
} from "@/lib/promo-schema";
import { checkConnection, putFile } from "./github-publish";
import { GateScreen, hashPassword, makeSalt, type GateMode } from "./gate";

/**
 * Панель рекламодателя — клиентский «остров».
 * Сайт статический, поэтому публикация = коммит promo.json (+ картинки)
 * в репозиторий через GitHub Contents API. Настройки и черновик живут
 * в localStorage этого браузера и никуда больше не отправляются.
 */

type Slot = "promo" | "recommend" | "pinned";

interface ImageState {
  dataUrl: string;
  fileName: string;
}

interface Draft {
  slot: Slot;
  advertiser: string;
  title: string;
  text: string;
  cta: string;
  url: string;
  erid: string;
  useManualPath: boolean;
  imagePath: string;
  image: ImageState | null;
  pinnedUrl: string; // ссылка на пост ВК для режима «Закреп»
}

interface Settings {
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
  token: string;
}

interface LogLine {
  kind: "info" | "ok" | "err";
  text: string;
  link?: string;
}

const DRAFT_KEY = "admin:promo-draft:v1";
const SETTINGS_KEY = "admin:gh-settings:v1";
const PASS_SALT_KEY = "admin:pass-salt:v1";
const PASS_HASH_KEY = "admin:pass-hash:v1";
const UNLOCK_KEY = "admin:unlocked:v1"; // sessionStorage — блокировка при закрытии браузера

type GateState = "loading" | GateMode | "open";

const DEFAULT_DRAFT: Draft = {
  slot: "promo",
  advertiser: "",
  title: "",
  text: "",
  cta: "Подробнее",
  url: "",
  erid: "",
  useManualPath: false,
  imagePath: "",
  image: null,
  pinnedUrl: "",
};

const DEFAULT_SETTINGS: Settings = { owner: "", repo: "", branch: "main", basePath: "", token: "" };

export function AdminPanel() {
  const [loaded, setLoaded] = useState(false);
  const [gate, setGate] = useState<GateState>("loading");
  const [gateBusy, setGateBusy] = useState(false);
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showToken, setShowToken] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [conn, setConn] = useState<{ ok: boolean; msg: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { slot, advertiser, title, text, cta, url, erid, useManualPath, imagePath, image, pinnedUrl } = draft;
  const { owner, repo, branch, basePath, token } = settings;
  const [foundPost, setFoundPost] = useState<Post | null>(null);
  const [searching, setSearching] = useState(false);
  const [currentPinned, setCurrentPinned] = useState<PinnedRef | null>(null);
  const [groupName, setGroupName] = useState("");

  // ── Замок, черновик и настройки: автозагрузка и автосохранение ─────────
  useEffect(() => {
    try {
      const passHash = localStorage.getItem(PASS_HASH_KEY);
      if (!passHash) {
        setGate("setup"); // первый запуск на этом устройстве
      } else {
        setGate(sessionStorage.getItem(UNLOCK_KEY) === "1" ? "open" : "locked");
      }
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setDraft({ ...DEFAULT_DRAFT, ...(JSON.parse(d) as Partial<Draft>) });
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) {
        setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Partial<Settings>) });
      } else {
        // Первое открытие на этом устройстве: basePath определяем сами из адреса
        // страницы (/repo/admin → /repo) — на GitHub Pages сайт обычно живёт
        // в подкаталоге /имя-репозитория.
        const m = window.location.pathname.match(/^(.+)\/admin\/?$/);
        if (m) setSettings((prev) => ({ ...prev, basePath: m[1] }));
      }
    } catch {
      /* повреждённый localStorage — начинаем с чистого */
    }
    setLoaded(true);
  }, []);

  // ── Замок: установка, разблокировка, сброс ─────────────────────────────
  async function handleGateSetup(password: string) {
    setGateBusy(true);
    try {
      const salt = makeSalt();
      localStorage.setItem(PASS_SALT_KEY, salt);
      localStorage.setItem(PASS_HASH_KEY, await hashPassword(salt, password));
      sessionStorage.setItem(UNLOCK_KEY, "1");
      setGate("open");
    } finally {
      setGateBusy(false);
    }
  }

  async function handleGateUnlock(password: string): Promise<boolean> {
    setGateBusy(true);
    try {
      const salt = localStorage.getItem(PASS_SALT_KEY) ?? "";
      const hash = await hashPassword(salt, password);
      if (hash && hash === localStorage.getItem(PASS_HASH_KEY)) {
        sessionStorage.setItem(UNLOCK_KEY, "1");
        setGate("open");
        return true;
      }
      return false;
    } finally {
      setGateBusy(false);
    }
  }

  function handleGateReset() {
    localStorage.removeItem(PASS_SALT_KEY);
    localStorage.removeItem(PASS_HASH_KEY);
    sessionStorage.removeItem(UNLOCK_KEY);
    setSettings((s) => ({ ...s, token: "" })); // сброс пароля убирает и токен
    setGate("setup");
  }

  function lockPanel() {
    sessionStorage.removeItem(UNLOCK_KEY);
    setGate("locked");
  }

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* переполнение квоты — черновик просто не сохранится */
    }
  }, [draft, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, loaded]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // ── Режим «Закреп»: разбор ссылки на пост ВК ────────────────────────────
  const parsedPostId = useMemo(() => {
    const m = pinnedUrl.match(/wall(-?\d+)_(\d+)/i);
    return m ? Number(m[2]) : null;
  }, [pinnedUrl]);

  // Ищем пост в выгруженных чанках ленты (page-1, page-2, …) — закрепить
  // можно только пост, который уже есть на сайте.
  useEffect(() => {
    if (slot !== "pinned" || parsedPostId == null) {
      setFoundPost(null);
      return;
    }
    let alive = true;
    setSearching(true);
    (async () => {
      for (let page = 1; page <= 40; page++) {
        let chunk: PostChunk | null = null;
        try {
          const res = await fetch(joinBasePath(basePath, `/data/posts/page-${page}.json`));
          if (!res.ok) break;
          chunk = (await res.json()) as PostChunk;
        } catch {
          break;
        }
        const hit = chunk?.posts.find((p) => p.id === parsedPostId);
        if (hit && alive) {
          setFoundPost(hit);
          setSearching(false);
          return;
        }
        if (!chunk || chunk.page >= chunk.pages) break;
      }
      if (alive) {
        setFoundPost(null);
        setSearching(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slot, parsedPostId, basePath]);

  // Текущий закреп (pinned.json) и название группы для предпросмотра.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(joinBasePath(basePath, "/data/pinned.json"));
        if (res.ok && alive) setCurrentPinned((await res.json()) as PinnedRef);
      } catch {
        /* файла ещё нет — не страшно */
      }
      try {
        const res = await fetch(joinBasePath(basePath, "/data/group.json"));
        if (res.ok && alive) setGroupName(((await res.json()) as { name: string }).name);
      } catch {
        /* без названия предпросмотр всё равно работает */
      }
    })();
    return () => {
      alive = false;
    };
  }, [basePath]);

  // ── Значение картинки и предпросмотр ───────────────────────────────────
  const previewImage = useManualPath
    ? joinBasePath(basePath, imagePath.trim() || "/img/posts/coffee.jpg")
    : (image?.dataUrl ?? "/img/posts/coffee.jpg");

  const previewPromo: Promo = useMemo(
    () => ({
      advertiser: advertiser.trim() || "Рекламодатель",
      title: title.trim() || "Заголовок рекламного предложения",
      text: text.trim() || "Короткий текст предложения — что, где, когда и на каких условиях.",
      image: previewImage,
      cta: cta.trim() || "Подробнее",
      url: url.trim() || "#",
      erid: erid.trim() || "—",
    }),
    [advertiser, title, text, cta, url, erid, previewImage],
  );

  /** Имя файла картинки, которое попадёт в репозиторий (и в скачанный JSON). */
  const uploadFileName = image
    ? `${slugify(advertiser || "promo")}-${hash6(image.dataUrl)}.jpg`
    : "";
  const finalImageValue = useManualPath
    ? joinBasePath(basePath, imagePath.trim())
    : joinBasePath(basePath, `/img/promo/${uploadFileName}`);

  // ── Валидация ──────────────────────────────────────────────────────────
  const currentForm = {
    advertiser,
    title,
    text,
    cta,
    url,
    erid,
    image: useManualPath ? imagePath.trim() : (image?.dataUrl ?? ""),
  };
  const validation = promoSchema.safeParse(currentForm);
  const errors = showErrors ? fieldErrorsOf(validation) : {};

  // Валидация режима «Закреп» — отдельная, без схемы промо-формы.
  const pinnedError = useMemo(() => {
    if (slot !== "pinned") return undefined;
    if (!pinnedUrl.trim()) return "Вставьте ссылку на пост ВК";
    if (parsedPostId == null)
      return "Не похоже на ссылку поста: в адресе должно быть wall-12345_678";
    if (!searching && !foundPost)
      return `Пост #${parsedPostId} не найден в выгруженных данных — закрепить можно только пост, который есть в ленте сайта`;
    return undefined;
  }, [slot, pinnedUrl, parsedPostId, searching, foundPost]);

  function validateOrFail(): boolean {
    setShowErrors(true);
    if (!validation.success) {
      addLog({ kind: "err", text: "Форма заполнена не до конца — исправьте поля с красной пометкой." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    return true;
  }

  // ── Картинка ───────────────────────────────────────────────────────────
  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToJpegDataUrl(file);
      set("image", { dataUrl, fileName: file.name });
    } catch (e) {
      setLog((l) => [{ kind: "err", text: e instanceof Error ? e.message : "Не удалось обработать файл." }, ...l]);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Скачивание (ручной режим) ──────────────────────────────────────────
  function downloadJson() {
    if (slot === "pinned") {
      if (!foundPost) {
        addLog({ kind: "err", text: "Сначала вставьте ссылку на пост и дождитесь, пока панель его найдёт." });
        return;
      }
      const ref: PinnedRef = { postId: foundPost.id, post: { ...foundPost, pinned: true } };
      triggerDownload(
        URL.createObjectURL(new Blob([JSON.stringify(ref, null, 2) + "\n"], { type: "application/json" })),
        "pinned.json",
      );
      addLog({ kind: "ok", text: "pinned.json скачан — замените файл public/data/pinned.json в репозитории." });
      return;
    }
    if (!validateOrFail()) return;
    const json =
      JSON.stringify(
        {
          advertiser: advertiser.trim(),
          title: title.trim(),
          text: text.trim(),
          image: finalImageValue || previewImage,
          cta: cta.trim(),
          url: url.trim(),
          erid: erid.trim(),
        },
        null,
        2,
      ) + "\n";
    const blob = new Blob([json], { type: "application/json" });
    triggerDownload(URL.createObjectURL(blob), `${slot}.json`);
    setLog((l) => [{ kind: "ok", text: `JSON скачан: ${slot}.json — замените файл public/data/${slot}.json в репозитории.` }, ...l]);
  }

  function downloadImage() {
    if (!image?.dataUrl) return;
    triggerDownload(image.dataUrl, uploadFileName || "promo.jpg");
  }

  function triggerDownload(href: string, name: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ── GitHub ─────────────────────────────────────────────────────────────
  const ghCfg = { owner: owner.trim(), repo: repo.trim().replace(/\.git$/, ""), branch: branch.trim() || "main" };

  async function handleCheck() {
    setChecking(true);
    setConn(null);
    const r = await checkConnection(ghCfg, token.trim());
    setConn(r.ok ? { ok: true, msg: "Подключение есть — можно публиковать." } : { ok: false, msg: r.error });
    setChecking(false);
  }

  function addLog(line: LogLine) {
    setLog((l) => [line, ...l].slice(0, 30));
  }

  async function handlePublish() {
    if (slot === "pinned") return handlePublishPinned();
    if (!validateOrFail()) return;
    if (!token.trim()) {
      setConn({ ok: false, msg: "Добавьте личный токен GitHub (PAT) — без него не опубликовать." });
      return;
    }

    setPublishing(true);
    setLog([]);
    try {
      addLog({ kind: "info", text: `Проверяю доступ к ${ghCfg.owner}/${ghCfg.repo}…` });
      const ping = await checkConnection(ghCfg, token.trim());
      if (!ping.ok) throw new Error(ping.error);
      addLog({ kind: "ok", text: "Доступ к репозиторию подтверждён." });

      let imageValue: string;
      if (useManualPath) {
        imageValue = joinBasePath(basePath, imagePath.trim());
        addLog({ kind: "info", text: `Использую готовый файл из репозитория: ${imageValue}` });
      } else {
        if (!image?.dataUrl) throw new Error("Загрузите картинку или включите режим готового файла.");
        const b64 = image.dataUrl.split(",")[1] ?? "";
        const repoPath = `public/img/promo/${uploadFileName}`;
        addLog({
          kind: "info",
          text: `Загружаю картинку ${repoPath} (~${Math.max(1, Math.round((b64.length * 0.75) / 1024))} КБ)…`,
        });
        const imgRes = await putFile(
          ghCfg,
          token.trim(),
          repoPath,
          b64,
          `promo: картинка для «${advertiser.trim()}» (панель рекламодателя)`,
          ghCfg.branch,
        );
        if (!imgRes.ok) throw new Error(imgRes.error);
        addLog({ kind: "ok", text: "Картинка закоммичена.", link: imgRes.commitUrl });
        imageValue = joinBasePath(basePath, `/img/promo/${uploadFileName}`);
      }

      const json =
        JSON.stringify(
          {
            advertiser: advertiser.trim(),
            title: title.trim(),
            text: text.trim(),
            image: imageValue,
            cta: cta.trim(),
            url: url.trim(),
            erid: erid.trim(),
          },
          null,
          2,
        ) + "\n";

      const dataPath = `public/data/${slot}.json`;
      addLog({ kind: "info", text: `Обновляю ${dataPath}…` });
      const jsonRes = await putFile(
        ghCfg,
        token.trim(),
        dataPath,
        utf8ToBase64(json),
        `promo: слот «${slot === "promo" ? "Промо-блок" : "Рекомендуем"}» — ${advertiser.trim()}`,
        ghCfg.branch,
      );
      if (!jsonRes.ok) throw new Error(jsonRes.error);
      addLog({ kind: "ok", text: `Слот «${slot === "promo" ? "Промо-блок" : "Рекомендуем"}» опубликован!`, link: jsonRes.commitUrl });
      addLog({
        kind: "info",
        text: "GitHub Actions пересоберёт сайт за 1–3 минуты — обновите страницу, чтобы увидеть новый рекламный пост.",
      });
    } catch (e) {
      addLog({ kind: "err", text: e instanceof Error ? e.message : "Неизвестная ошибка." });
    } finally {
      setPublishing(false);
    }
  }

  // ── Режим «Закреп»: публикация pinned.json и откреп ─────────────────────
  async function handlePublishPinned() {
    if (!foundPost) {
      addLog({ kind: "err", text: pinnedError ?? "Сначала вставьте ссылку на пост и дождитесь предпросмотра." });
      return;
    }
    if (!token.trim()) {
      setConn({ ok: false, msg: "Добавьте личный токен GitHub (PAT) — без него не опубликовать." });
      return;
    }

    setPublishing(true);
    setLog([]);
    try {
      addLog({ kind: "info", text: `Проверяю доступ к ${ghCfg.owner}/${ghCfg.repo}…` });
      const ping = await checkConnection(ghCfg, token.trim());
      if (!ping.ok) throw new Error(ping.error);
      addLog({ kind: "ok", text: "Доступ к репозиторию подтверждён." });

      const ref: PinnedRef = { postId: foundPost.id, post: { ...foundPost, pinned: true } };
      const json = JSON.stringify(ref, null, 2) + "\n";
      addLog({ kind: "info", text: "Обновляю public/data/pinned.json…" });
      const res = await putFile(
        ghCfg,
        token.trim(),
        "public/data/pinned.json",
        utf8ToBase64(json),
        `pinned: закреп поста #${foundPost.id} (панель)`,
        ghCfg.branch,
      );
      if (!res.ok) throw new Error(res.error);
      addLog({ kind: "ok", text: `Пост #${foundPost.id} закреплён — теперь он первый в ленте сайта.`, link: res.commitUrl });
      addLog({ kind: "info", text: "GitHub Actions пересоберёт сайт за 1–3 минуты — обновите страницу." });
      setCurrentPinned(ref);
    } catch (e) {
      addLog({ kind: "err", text: e instanceof Error ? e.message : "Неизвестная ошибка." });
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpin() {
    if (!token.trim()) {
      setConn({ ok: false, msg: "Добавьте личный токен GitHub (PAT) — без него не опубликовать." });
      return;
    }
    setPublishing(true);
    setLog([]);
    try {
      const ping = await checkConnection(ghCfg, token.trim());
      if (!ping.ok) throw new Error(ping.error);
      const empty: PinnedRef = { postId: null, post: null };
      const res = await putFile(
        ghCfg,
        token.trim(),
        "public/data/pinned.json",
        utf8ToBase64(JSON.stringify(empty, null, 2) + "\n"),
        "pinned: откреп поста (панель)",
        ghCfg.branch,
      );
      if (!res.ok) throw new Error(res.error);
      addLog({ kind: "ok", text: "Закреп снят.", link: res.commitUrl });
      setCurrentPinned(empty);
    } catch (e) {
      addLog({ kind: "err", text: e instanceof Error ? e.message : "Неизвестная ошибка." });
    } finally {
      setPublishing(false);
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────
  if (gate === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (gate !== "open") {
    return (
      <GateScreen
        mode={gate}
        busy={gateBusy}
        onSetup={handleGateSetup}
        onUnlock={handleGateUnlock}
        onReset={handleGateReset}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/60 bg-card/40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow">
              <Megaphone className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">Панель рекламодателя</p>
              <p className="text-xs leading-tight text-muted-foreground">загрузка рекламного поста в ленту</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={lockPanel} title="Заблокировать панель до ввода пароля">
              <Lock className="size-4" />
              <span className="hidden sm:inline">Заблокировать</span>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <LogOut className="size-4 rotate-180" />
                На сайт
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 pt-6 sm:px-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ── Левая колонка: предпросмотр + форма ── */}
          <div className="min-w-0 space-y-5">
            <section>
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Живой предпросмотр
                </h2>
                <Badge variant="outline" className="text-[10px]">
                  {slot === "promo" ? "слот: промо-блок" : slot === "recommend" ? "слот: рекомендуем" : "режим: закреп"}
                </Badge>
              </div>
              {slot === "promo" ? (
                <div className="max-w-[680px]">
                  <PromoCard promo={previewPromo} />
                </div>
              ) : slot === "recommend" ? (
                <div className="max-w-[336px]">
                  <RecommendCard rec={previewPromo} />
                </div>
              ) : (
                <div className="max-w-[680px]">
                  {foundPost ? (
                    <PostCard post={{ ...foundPost, pinned: true }} groupName={groupName || "Группа ВК"} />
                  ) : (
                    <div className="rounded-2xl border border-dashed p-8 text-center">
                      <Pin className="mx-auto mb-2 size-6 text-sky-500" />
                      <p className="text-sm text-muted-foreground">
                        Вставьте ссылку на пост ВК — здесь появится живой предпросмотр карточки
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Слот */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Где показать</CardTitle>
                <CardDescription>Два платных слота для рекламы и бесплатный закреп поста группы</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <SlotOption
                  active={slot === "promo"}
                  onClick={() => set("slot", "promo")}
                  icon={<Megaphone className="size-4" />}
                  title="Промо-блок"
                  desc="Верх ленты, градиентная рамка — максимальный охват"
                  gradient="from-violet-600 to-fuchsia-500"
                />
                <SlotOption
                  active={slot === "recommend"}
                  onClick={() => set("slot", "recommend")}
                  icon={<Handshake className="size-4" />}
                  title="Рекомендуем"
                  desc="Боковая колонка, спокойный стиль — как партнёр сообщества"
                  gradient="from-emerald-500 to-teal-500"
                />
                <SlotOption
                  active={slot === "pinned"}
                  onClick={() => set("slot", "pinned")}
                  icon={<Pin className="size-4" />}
                  title="Закреп"
                  desc="Пост группы первым на стене сайта — без маркировки рекламы"
                  gradient="from-sky-500 to-blue-600"
                />
              </CardContent>
            </Card>

            {slot === "pinned" ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Какой пост закрепить</CardTitle>
                  <CardDescription>
                    Вставьте ссылку на пост из группы — панель сама найдёт его в ленте.
                    Картинка и ЕРИД не нужны: это обычный пост группы, а не реклама.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field
                    label="Ссылка на пост ВК"
                    error={showErrors ? pinnedError : undefined}
                    hint={searching ? "Ищу пост в ленте…" : foundPost ? `Найден пост #${foundPost.id}` : undefined}
                  >
                    <Input
                      value={pinnedUrl}
                      onChange={(e) => set("pinnedUrl", e.target.value)}
                      placeholder="https://vk.com/wall-123456_789"
                      inputMode="url"
                    />
                  </Field>
                  {currentPinned?.postId && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Сейчас закреплён пост #{currentPinned.postId}</p>
                        <p className="text-xs text-muted-foreground">Он показывается первой карточкой ленты</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => void handleUnpin()} disabled={publishing}>
                        {publishing ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                        Открепить
                      </Button>
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Закреп занимает первую карточку ленты и не повторяется при прокрутке.
                    Чужая реклама размещается через платные слоты — с маркировкой и ЕРИД.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
            {/* Текст */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Содержание</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Рекламодатель" error={errors.advertiser} hint="Название компании или бренда">
                  <Input
                    value={advertiser}
                    onChange={(e) => set("advertiser", e.target.value)}
                    placeholder="Кофейня «Зерно»"
                    maxLength={80}
                  />
                </Field>
                <Field label="Заголовок" error={errors.title} hint={`${title.length}/120`}>
                  <Input
                    value={title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="−20% на всё меню до конца недели"
                    maxLength={120}
                  />
                </Field>
                <Field label="Текст предложения" error={errors.text} hint={`${text.length}/400`}>
                  <Textarea
                    value={text}
                    onChange={(e) => set("text", e.target.value)}
                    placeholder="Промокод НАШГОРОД — на любой напиток и десерт…"
                    rows={3}
                    maxLength={400}
                  />
                </Field>
                <Field label="Надпись на кнопке" error={errors.cta}>
                  <Input value={cta} onChange={(e) => set("cta", e.target.value)} placeholder="Забрать скидку" maxLength={30} />
                </Field>
              </CardContent>
            </Card>

            {/* Картинка */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Картинка</CardTitle>
                <CardDescription>
                  Загруженный файл сожмётся до 1200&nbsp;px по ширине и уйдёт в репозиторий (public/img/promo/)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {useManualPath ? (
                  <Field
                    label="Путь к готовому файлу в репозитории"
                    error={errors.image}
                    hint="Например: /img/posts/coffee.jpg — файл уже должен лежать в public/"
                  >
                    <Input
                      value={imagePath}
                      onChange={(e) => set("imagePath", e.target.value)}
                      placeholder="/img/posts/concert.jpg"
                    />
                  </Field>
                ) : image ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border">
                      <img src={image.dataUrl} alt="Предпросмотр загруженной картинки" className="max-h-64 w-full object-contain" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {image.fileName} · в репозитории будет: /img/promo/{uploadFileName || "…"}
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                        <RefreshCw className="size-4" />
                        Заменить
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => set("image", null)}>
                        Убрать
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition hover:bg-muted/50",
                        errors.image && "border-destructive/60",
                      )}
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-muted">
                        <ImagePlus className="size-5 text-muted-foreground" />
                      </span>
                      <span className="text-sm font-semibold">Загрузить картинку</span>
                      <span className="text-xs text-muted-foreground">JPG, PNG или WebP · желательно горизонтальная 16:10</span>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => void onFilePicked(e.target.files?.[0])}
                      />
                    </label>
                    {errors.image && <p className="text-xs font-medium text-destructive">{errors.image}</p>}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Файл уже в репозитории</p>
                    <p className="text-xs text-muted-foreground">
                      Включите, если не хотите загружать новую картинку
                    </p>
                  </div>
                  <Switch
                    checked={useManualPath}
                    onCheckedChange={(v) => set("useManualPath", v)}
                    aria-label="Использовать готовый файл"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ссылка и маркировка */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ссылка и маркировка</CardTitle>
                <CardDescription>
                  По закону «О рекламе» карточка обязана вести на рекламируемый ресурс и иметь ЕРИД
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Ссылка перехода" error={errors.url} hint="Куда попадёт читатель по кнопке">
                  <Input value={url} onChange={(e) => set("url", e.target.value)} placeholder="https://vk.com/..." inputMode="url" />
                </Field>
                <Field
                  label="ЕРИД — токен рекламы"
                  error={errors.erid}
                  hint="Выдаёт ОРД после приёма рекламы. Для нерекламных анонсов поставьте «—»"
                >
                  <Input value={erid} onChange={(e) => set("erid", e.target.value)} placeholder="например: tAd-ABC12-34567" />
                </Field>
              </CardContent>
            </Card>
              </>
            )}
          </div>

          {/* ── Правая колонка: публикация ── */}
          <aside className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Rocket className="size-4 text-fuchsia-500" />
                  Публикация
                </CardTitle>
                <CardDescription>
                  Панель коммитит JSON и картинку в репозиторий — дальше Actions пересобирает сайт сам
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Владелец" error={conn && !conn.ok && !owner ? "Заполните" : undefined}>
                    <Input
                      value={owner}
                      onChange={(e) => setSettings((s) => ({ ...s, owner: e.target.value }))}
                      placeholder="ivanov"
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Репозиторий">
                    <Input
                      value={repo}
                      onChange={(e) => setSettings((s) => ({ ...s, repo: e.target.value }))}
                      placeholder="nashgorod-site"
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ветка">
                    <Input
                      value={branch}
                      onChange={(e) => setSettings((s) => ({ ...s, branch: e.target.value }))}
                      placeholder="main"
                    />
                  </Field>
                  <Field label="basePath" hint="Обычно определяется сам — /имя-репозитория">
                    <Input
                      value={basePath}
                      onChange={(e) => setSettings((s) => ({ ...s, basePath: e.target.value }))}
                      placeholder="/nashgorod-site"
                    />
                  </Field>
                </div>

                <Field
                  label="Токен GitHub (PAT)"
                  hint={
                    <span className="flex items-start gap-1.5">
                      <ShieldCheck className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                      Хранится только в этом браузере. Права: Contents — Read and write
                    </span>
                  }
                >
                  <div className="relative">
                    <Input
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => setSettings((s) => ({ ...s, token: e.target.value }))}
                      placeholder="github_pat_…"
                      autoComplete="off"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                      aria-label={showToken ? "Скрыть токен" : "Показать токен"}
                    >
                      {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                {token && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-fit text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setSettings((s) => ({ ...s, token: "" }));
                      setConn(null);
                    }}
                  >
                    <X className="size-3.5" />
                    Забыть токен в этом браузере
                  </Button>
                )}

                <Button variant="outline" size="sm" className="w-full" onClick={() => void handleCheck()} disabled={checking}>
                  {checking ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                  Проверить подключение
                </Button>
                {conn && (
                  <p className={cn("text-xs leading-relaxed", conn.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {conn.msg}
                  </p>
                )}

                <Separator />

                <Button className="w-full" onClick={() => void handlePublish()} disabled={publishing}>
                  {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                  {publishing ? "Публикую…" : slot === "pinned" ? "Закрепить пост" : "Опубликовать рекламный пост"}
                </Button>

                <div>
                  <p className="mb-2 text-center text-xs text-muted-foreground">или вручную, без токена</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={downloadJson}>
                      <Download className="size-4" />
                      JSON-файл
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadImage} disabled={slot === "pinned" || useManualPath || !image}>
                      <Download className="size-4" />
                      Картинка
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {log.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Журнал</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs leading-relaxed">
                  {log.map((l, i) => (
                    <p
                      key={`${i}-${l.text.slice(0, 12)}`}
                      className={cn(
                        "flex gap-1.5",
                        l.kind === "err" && "text-destructive",
                        l.kind === "ok" && "text-emerald-600 dark:text-emerald-400",
                        l.kind === "info" && "text-muted-foreground",
                      )}
                    >
                      {l.kind === "ok" && <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />}
                      {l.kind === "err" && <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />}
                      <span className="min-w-0 break-words">
                        {l.text}
                        {l.link && (
                          <>
                            {" "}
                            <a href={l.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                              открыть
                            </a>
                          </>
                        )}
                      </span>
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Как это работает</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p>1. Панель проверяет форму и коммитит картинку в <code className="rounded bg-muted px-1">public/img/promo/</code>.</p>
                <p>2. Затем обновляет <code className="rounded bg-muted px-1">public/data/{slot}.json</code> — файл, который читает лента.</p>
                <p>3. GitHub Actions собирает статические страницы и выкладывает их на Pages — 1–3 минуты.</p>
                <p>4. Черновик и настройки сохраняются в этом браузере автоматически — можно вернуться позже.</p>
                <Separator />
                <p className="flex items-start gap-1.5 text-foreground">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  Сама страница ничего изменить не может — у неё нет ни сервера, ни пароля.
                  Единственный ключ — ваш личный токен GitHub: он есть только у вас,
                  никогда не попадает в код сайта и удаляется кнопкой «Забыть токен».
                  Экран блокировки закрывает панель паролем этого устройства.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

/** Подпись поля + подсказка + ошибка валидации. */
function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-[13px] font-semibold">{label}</Label>
        {hint && !error && <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : (
        hint && <span className="sr-only">{typeof hint === "string" ? hint : ""}</span>
      )}
    </div>
  );
}

function SlotOption({
  active,
  onClick,
  icon,
  title,
  desc,
  gradient,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 text-left transition",
        active ? "border-fuchsia-500/60 bg-fuchsia-500/5 ring-2 ring-fuchsia-500/25" : "hover:bg-muted/50",
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow", gradient)}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{desc}</span>
      </span>
      {active && <CheckCircle2 className="ml-auto mt-0.5 size-4 shrink-0 text-fuchsia-500" />}
    </button>
  );
}
