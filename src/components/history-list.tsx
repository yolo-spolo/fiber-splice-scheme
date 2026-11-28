"use client";

import { useState, useTransition } from "react";
import { restoreEvent } from "@/lib/actions/history";
import { actorLabel, type HistoryViewItem } from "@/lib/history-labels";
import type { HistoryChange } from "@/lib/history-diff";

/**
 * Список изменений муфты: свежие сверху. Общий для владельца и гостя —
 * разница только в кнопке «Вернуть», которую гость не видит (и не получит:
 * restoreEvent на сервере проверяет сессию владельца).
 */
export function HistoryList({
  events,
  canRestore = false,
  emptyText = "Изменений пока нет. Они появятся, как только вы поправите кабель, сварку или параметры муфты.",
}: {
  events: HistoryViewItem[];
  canRestore?: boolean;
  emptyText?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {events.length === 0 ? (
        <p className="card px-4 py-8 text-center text-[13px] text-[var(--color-ink-500)]">
          {emptyText}
        </p>
      ) : (
        <ul className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {events.map((event) => (
            <li key={event.id} className="px-4 py-2.5">
              <div className="flex flex-wrap items-start gap-2">
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
                {canRestore && event.restorable && (
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
              </div>

              {event.changes.length > 0 && (
                <ChangeDetails
                  changes={event.changes}
                  open={opened === event.id}
                  onToggle={() => setOpened(opened === event.id ? null : event.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * «Было → стало» спрятано под кнопку: в списке из двухсот записей открытые
 * подробности у всех сразу превращают историю в нечитаемую простыню. В
 * документе для заказчика эти же данные печатаются без кнопок.
 */
function ChangeDetails({
  changes,
  open,
  onToggle,
}: {
  changes: HistoryChange[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-1.5">
      <button
        type="button"
        className="text-[11.5px] text-[var(--color-accent)] hover:underline"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? "Скрыть подробности" : `Что изменилось · ${changes.length}`}
      </button>
      {open && (
        <table className="mt-1.5 w-full max-w-[560px] border-collapse text-[12px]">
          <tbody>
            {changes.map((change) => (
              <tr key={change.field} className="align-top">
                <td className="w-[110px] py-0.5 pr-2 text-[var(--color-ink-500)]">
                  {change.label}
                </td>
                <td className="py-0.5 pr-2 break-words text-[var(--color-ink-700)]">
                  {change.before}
                </td>
                <td className="w-4 py-0.5 pr-2 text-[var(--color-ink-400)]" aria-label="стало">
                  →
                </td>
                <td className="py-0.5 break-words font-medium">{change.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
