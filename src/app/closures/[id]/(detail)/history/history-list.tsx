"use client";

import { useState, useTransition } from "react";
import { restoreEvent } from "@/lib/actions/history";
import { actorLabel } from "@/lib/history-labels";

type EventItem = {
  id: string;
  actorKind: string;
  actorName: string;
  action: string;
  actionLabel: string;
  summary: string;
  createdAt: string;
  restorable: boolean;
};

/**
 * История изменений муфты. Свежие сверху; возврат доступен только для тех
 * изменений, где сохранён снимок поля (см. RESTORABLE на сервере).
 */
export function HistoryList({ events }: { closureId: string; events: EventItem[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[16px]">История изменений</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
          Кто и что менял в муфте: владелец или гость по ссылке с правом правки.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {events.length === 0 ? (
        <p className="card px-4 py-8 text-center text-[13px] text-[var(--color-ink-500)]">
          Изменений пока нет. Они появятся, как только вы поправите кабель, сварку или параметры
          муфты.
        </p>
      ) : (
        <ul className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-start gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] font-medium">{actorLabel(event)}</span>
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-ink-400)]">
                    {event.actionLabel}
                  </span>
                  {/* Возврат помечаем явно: рядом с исходной правкой он иначе
                      выглядит как ещё одно такое же изменение. */}
                  {event.summary.startsWith("возврат") && (
                    <span className="chip !px-1.5 !py-0 !text-[10px] uppercase">возврат</span>
                  )}
                </div>
                <div className="mt-0.5 break-words text-[12.5px] text-[var(--color-ink-700)]">
                  {event.summary}
                </div>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-ink-400)]">
                {new Date(event.createdAt).toLocaleString("ru-RU", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              {event.restorable && (
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-0.5 text-[11.5px]"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      setError(null);
                      const result = await restoreEvent(event.id);
                      if (result?.error) setError(result.error);
                    })
                  }
                >
                  Вернуть
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
