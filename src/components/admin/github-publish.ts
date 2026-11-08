/**
 * Клиент GitHub Contents API — коммит файлов прямо из браузера администратора.
 *
 * Сайт статический (GitHub Pages), сервера у него нет, поэтому «сохранить
 * рекламный пост» = закоммитить JSON и картинку в репозиторий. Дальше
 * GitHub Actions пересобирает Pages автоматически (см. README-GITHUB-PAGES.md).
 *
 * Токен передаётся только из браузера админа и никогда не попадает в код сайта.
 */

export interface GhConfig {
  owner: string;
  repo: string;
  branch: string;
}

export type GhResult =
  | { ok: true; commitUrl: string }
  | { ok: false; error: string };

const API = "https://api.github.com";

function headers(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function fileUrl(cfg: GhConfig, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${encoded}`;
}

/** Проверка доступа к репозиторию — GET /repos/{owner}/{repo}. */
export async function checkConnection(cfg: GhConfig, token: string): Promise<GhResult> {
  if (!cfg.owner || !cfg.repo) {
    return { ok: false, error: "Заполните владельца и имя репозитория." };
  }
  if (!token) {
    return { ok: false, error: "Добавьте личный токен GitHub (PAT)." };
  }
  try {
    const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}`, {
      headers: headers(token),
    });
    if (res.status === 200) {
      return { ok: true, commitUrl: `https://github.com/${cfg.owner}/${cfg.repo}` };
    }
    if (res.status === 401) {
      return { ok: false, error: "401 — токен недействителен или истёк. Выпустите новый в настройках GitHub." };
    }
    if (res.status === 404) {
      return { ok: false, error: "404 — репозиторий не найден. Проверьте владельца/имя и что токену доступен этот репозиторий." };
    }
    if (res.status === 403) {
      return { ok: false, error: "403 — у токена нет нужных прав (нужен scope repo или Contents: Read and write)." };
    }
    return { ok: false, error: `GitHub ответил ${res.status}.` };
  } catch {
    return { ok: false, error: "Не удалось связаться с api.github.com — проверьте сеть." };
  }
}

/** Текущий SHA файла (null, если файла ещё нет). */
async function getSha(cfg: GhConfig, token: string, path: string, branch: string): Promise<string | null> {
  const res = await fetch(`${fileUrl(cfg, path)}?ref=${encodeURIComponent(branch)}`, {
    headers: headers(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Не удалось прочитать ${path} (HTTP ${res.status}).`);
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

/** Создание/обновление файла одним коммитом. */
export async function putFile(
  cfg: GhConfig,
  token: string,
  path: string,
  contentBase64: string,
  message: string,
  branch: string,
): Promise<GhResult> {
  try {
    let sha: string | null = null;
    try {
      sha = await getSha(cfg, token, path, branch);
    } catch {
      // Файла может не быть — это нормально для первой публикации.
      sha = null;
    }

    const body = () =>
      JSON.stringify({
        message,
        content: contentBase64,
        branch,
        ...(sha ? { sha } : {}),
      });

    let res = await fetch(fileUrl(cfg, path), {
      method: "PUT",
      headers: headers(token),
      body: body(),
    });

    // 409 — кто-то изменил файл между чтением и записью: перечитываем sha и повторяем.
    if (res.status === 409) {
      sha = await getSha(cfg, token, path, branch);
      res = await fetch(fileUrl(cfg, path), {
        method: "PUT",
        headers: headers(token),
        body: body(),
      });
    }

    if (res.ok) {
      const data = (await res.json()) as { commit?: { html_url?: string } };
      return {
        ok: true,
        commitUrl:
          data.commit?.html_url ??
          `https://github.com/${cfg.owner}/${cfg.repo}/commits/${branch}`,
      };
    }
    if (res.status === 401) {
      return { ok: false, error: "401 — токен недействителен. Выпустите новый PAT." };
    }
    if (res.status === 403) {
      return {
        ok: false,
        error:
          "403 — нет прав на запись. Для fine-grained токена включите «Contents: Read and write», для классического — scope repo.",
      };
    }
    if (res.status === 404) {
      return { ok: false, error: "404 — не найден репозиторий или ветка. Проверьте настройки публикации." };
    }
    if (res.status === 422) {
      return { ok: false, error: "422 — GitHub отклонил коммит (обычно неверное имя ветки)." };
    }
    const text = await res.text();
    return { ok: false, error: `GitHub ответил ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Неизвестная ошибка сети." };
  }
}
