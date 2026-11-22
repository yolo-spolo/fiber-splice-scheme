"use client";

import { useState, useTransition } from "react";
import { createCassette, deleteCassette } from "@/lib/actions/cassettes";

export function CassettePanel({
  closureId,
  cassettes,
  splices,
}: {
  closureId: string;
  cassettes: { id: string; number: number; capacity: number; label: string | null }[];
  splices: { id: string; cassetteId: string | null }[];
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const used = new Map<string, number>();
  for (const s of splices) {
    if (s.cassetteId) used.set(s.cassetteId, (used.get(s.cassetteId) ?? 0) + 1);
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px]">Кассеты</h2>
          <p className="text-[12px] text-[var(--color-ink-500)]">
            Сварки распределяются по кассетам — ёмкость проверяется автоматически
          </p>
        </div>
        <button type="button" className="btn btn-ghost px-2.5 py-1 text-[12.5px]" onClick={() => setOpen((v) => !v)}>
          + Кассета
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {open && (
        <form
          className="mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-[var(--color-canvas)] p-2.5"
          action={async (formData) => {
            const res = await createCassette(formData);
            if (res?.error) setError(res.error);
            else {
              setError(null);
              setOpen(false);
            }
          }}
        >
          <input type="hidden" name="closureId" value={closureId} />
          <label className="block">
            <span className="label">Ёмкость</span>
            <input className="field !w-24" type="number" name="capacity" defaultValue={12} min={1} max={96} />
          </label>
          <label className="block flex-1">
            <span className="label">Название (необязательно)</span>
            <input className="field" name="label" placeholder="Кассета 2, нижняя" />
          </label>
          <button type="submit" className="btn btn-primary">
            Добавить
          </button>
        </form>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {cassettes.map((c) => {
          const count = used.get(c.id) ?? 0;
          const overflow = count > c.capacity;
          return (
            <div
              key={c.id}
              className={`rounded-xl border p-2.5 ${
                overflow ? "border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)]/25" : "border-[var(--color-line)]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-semibold">Кассета {c.number}</span>
                <span className={`text-[12px] tabular-nums ${overflow ? "font-semibold text-[var(--color-danger)]" : "text-[var(--color-ink-500)]"}`}>
                  {count}/{c.capacity}
                </span>
              </div>
              {c.label && <div className="truncate text-[11.5px] text-[var(--color-ink-400)]">{c.label}</div>}
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-track)]">
                <div
                  className={`h-full ${overflow ? "bg-[var(--color-danger)]" : "bg-[var(--color-accent)]"}`}
                  style={{ width: `${Math.min(100, (count / c.capacity) * 100)}%` }}
                />
              </div>
              {cassettes.length > 1 && (
                <button
                  type="button"
                  className="mt-1.5 text-[11px] text-[var(--color-ink-400)] hover:text-[var(--color-danger)]"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Удалить кассету ${c.number}?`)) return;
                    start(async () => {
                      await deleteCassette(c.id);
                    });
                  }}
                >
                  удалить
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
