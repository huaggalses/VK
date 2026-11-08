"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Megaphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Экран блокировки панели.
 *
 * Пароль — это «замок на дверь» конкретного устройства: он закрывает форму
 * и сохранённый в этом браузере GitHub-токен от чужих глаз. Хэш пароля живёт
 * в localStorage этого браузера и не попадает в публичный репозиторий.
 * Настоящая защита сайта осталась прежней — личный токен GitHub.
 */

export type GateMode = "setup" | "locked";

export function makeSalt(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 от salt+пароль; в незащищённом контексте — запасной простой хэш. */
export async function hashPassword(salt: string, password: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h1 = 0x811c9dc5;
    let h2 = 0x1000193;
    const s = `${salt}:${password}`;
    for (let i = 0; i < s.length; i++) {
      h1 = ((h1 ^ s.charCodeAt(i)) * 0x01000193) >>> 0;
      h2 = ((h2 + s.charCodeAt(i) * (i + 7)) * 31) >>> 0;
    }
    return `fb${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
  }
}

export function GateScreen({
  mode,
  busy,
  onSetup,
  onUnlock,
  onReset,
}: {
  mode: GateMode;
  busy: boolean;
  onSetup: (password: string) => Promise<void>;
  onUnlock: (password: string) => Promise<boolean>;
  onReset: () => void;
}) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (mode === "setup") {
      if (p1.length < 4) return setErr("Пароль — минимум 4 символа.");
      if (p1 !== p2) return setErr("Пароли не совпадают.");
      await onSetup(p1);
    } else {
      const ok = await onUnlock(pw);
      if (!ok) setErr("Неверный пароль.");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-background to-muted/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow">
            <Megaphone className="size-5" />
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight">Панель рекламодателя</h1>
            <p className="text-xs leading-tight text-muted-foreground">
              {mode === "setup" ? "первый запуск на этом устройстве" : "панель заблокирована"}
            </p>
          </div>
        </div>

        {mode === "setup" ? (
          <>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Придумайте пароль для панели на этом устройстве. Он сохранится только
              в этом браузере и никуда не отправляется.
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">Новый пароль</Label>
                <PasswordInput value={p1} onChange={setP1} show={show} setShow={setShow} autoFocus onKeyDown={() => void submit()} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">Повторите пароль</Label>
                <Input
                  type={show ? "text" : "password"}
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                  placeholder="ещё раз"
                  autoComplete="new-password"
                />
              </div>
              {err && <p className="text-xs font-medium text-destructive">{err}</p>}
              <Button className="w-full" onClick={() => void submit()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Установить пароль
              </Button>
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                Публикация всё равно возможна только с вашим личным токеном GitHub —
                пароль лишь закрывает панель от лишних глаз.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              Введите пароль панели, установленный на этом устройстве.
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-semibold">Пароль</Label>
                <PasswordInput value={pw} onChange={setPw} show={show} setShow={setShow} autoFocus onKeyDown={() => void submit()} />
              </div>
              {err && <p className="text-xs font-medium text-destructive">{err}</p>}
              <Button className="w-full" onClick={() => void submit()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Открыть панель
              </Button>
              <button
                type="button"
                onClick={onReset}
                className="mx-auto block text-xs text-muted-foreground underline-offset-4 transition hover:text-destructive hover:underline"
              >
                Забыли пароль? Сбросить (токен тоже будет удалён)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  setShow,
  autoFocus,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (v: boolean) => void;
  autoFocus?: boolean;
  onKeyDown?: () => void;
}) {
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onKeyDown?.()}
        placeholder="••••••••"
        autoFocus={autoFocus}
        autoComplete={value ? "current-password" : "new-password"}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
        aria-label={show ? "Скрыть пароль" : "Показать пароль"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
