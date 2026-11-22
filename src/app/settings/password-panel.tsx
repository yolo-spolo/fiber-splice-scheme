"use client";

import { useFormStatus } from "react-dom";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

export function PasswordPanel({ error, ok }: { error?: string; ok?: string }) {
  return (
    <section className="card p-4">
      <h2 className="text-[15px]">Пароль</h2>
      <p className="mt-0.5 mb-3 text-[12.5px] text-[var(--color-ink-500)]">
        Минимум {PASSWORD_MIN_LENGTH} символов, спецсимволы не обязательны. После смены
        остальные устройства потребуют вход заново.
      </p>
      <form action="/api/auth/password" method="post" className="space-y-2.5">
        <label className="block">
          <span className="label">Текущий пароль</span>
          <input className="field" type="password" name="current" autoComplete="current-password" required />
        </label>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="label">Новый пароль</span>
            <input
              className="field"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </label>
          <label className="block">
            <span className="label">Повторите</span>
            <input
              className="field"
              type="password"
              name="repeat"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-danger)]">
            {error}
          </p>
        )}
        {ok && (
          <p className="rounded-lg bg-[var(--color-accent-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-accent)]">
            {ok}
          </p>
        )}

        <PasswordSubmit />
      </form>
    </section>
  );
}

function PasswordSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary px-3 py-1.5 text-[13px]" disabled={pending}>
      {pending ? "Сохраняю…" : "Сменить пароль"}
    </button>
  );
}
