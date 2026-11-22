"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export function SetupForm({ error }: { error?: string }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");

  const tooShort = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
  const mismatch = repeat.length > 0 && password !== repeat;

  return (
    <form action="/api/auth/setup" method="post" className="space-y-3.5">
      <label className="block">
        <span className="label">Пароль</span>
        <input
          className="field"
          type="password"
          name="password"
          autoFocus
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span className="mt-1 block text-[11.5px] text-[var(--color-ink-400)]">
          Минимум {PASSWORD_MIN_LENGTH} символов. Спецсимволы и заглавные буквы не обязательны.
        </span>
      </label>

      <label className="block">
        <span className="label">Повторите пароль</span>
        <input
          className="field"
          type="password"
          name="repeat"
          autoComplete="new-password"
          placeholder="Ещё раз"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </label>

      {tooShort && (
        <p className="text-[12.5px] font-medium text-[var(--color-warn)]">
          Осталось {PASSWORD_MIN_LENGTH - password.length} симв.
        </p>
      )}
      {mismatch && (
        <p className="text-[12.5px] font-medium text-[var(--color-danger)]">Пароли не совпадают</p>
      )}
      {error && (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <SetupSubmitButton />
    </form>
  );
}

function SetupSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Сохраняю…" : "Задать пароль и войти"}
    </button>
  );
}
