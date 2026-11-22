"use client";

import { useFormStatus } from "react-dom";

/**
 * Обычная POST-форма на route handler: вход работает и до гидратации,
 * и с выключенным JavaScript. Ошибка приходит в query-параметре.
 */
export function LoginForm({ next, error }: { next: string; error?: string }) {
  return (
    <form action="/api/auth/login" method="post" className="space-y-3.5">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">Пароль</span>
        <input
          className="field"
          type="password"
          name="password"
          autoFocus
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </label>
      {error && (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Проверяю…" : "Войти"}
    </button>
  );
}
