"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveGuestName } from "@/lib/actions/guest";

/**
 * Обязательный шаг перед первой правкой: без имени история изменений
 * превращается в «кто-то что-то поменял».
 */
export function GuestNameForm({ token, initialName = "" }: { token: string; initialName?: string }) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  return (
    <form
      className="space-y-2"
      action={async (formData) => {
        setError(null);
        setPending(true);
        const result = await saveGuestName(token, String(formData.get("name") ?? ""));
        if (result?.error) {
          setError(result.error);
          setPending(false);
          return;
        }
        // Cookie уже стоит, но серверный экшен не перерисовывает текущую
        // страницу: обновляем её сами, чтобы открылся редактор.
        router.refresh();
      }}
    >
      <label className="block">
        <span className="label">Ваше имя</span>
        <input
          className="field"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Иван Петров"
          autoComplete="name"
          maxLength={60}
          required
        />
      </label>
      <p className="text-[11.5px] text-[var(--color-ink-500)]">
        Имя подписывает каждое изменение в истории муфты — по ней исполнитель увидит, кто что
        поправил.
      </p>
      {error && <p className="text-[12px] text-[var(--color-danger)]">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Сохраняю…" : "Продолжить"}
      </button>
    </form>
  );
}
