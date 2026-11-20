"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/ui/fields";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => login(formData),
    undefined,
  );

  return (
    <form action={action} className="space-y-3.5">
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
      {state?.error && (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] font-medium text-[var(--color-danger)]">
          {state.error}
        </p>
      )}
      <SubmitButton className="btn btn-primary w-full" pendingText="Проверяю…">
        Войти
      </SubmitButton>
    </form>
  );
}
