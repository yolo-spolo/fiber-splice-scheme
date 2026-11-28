import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { closureHistory } from "@/lib/history";
import { toHistoryItem } from "@/lib/history-labels";
import { loadSharedClosure, resolveShareToken } from "@/lib/share";
import { shareCanEdit } from "@/lib/share-access";
import { closureTitle } from "@/lib/address";
import { HistoryList } from "@/components/history-list";
import { ShareUnavailable } from "../../../share-unavailable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * История изменений муфты по ссылке — только чтение. Возврат поля остаётся
 * у владельца: restoreEvent проверяет сессию, здесь кнопки просто нет.
 */
export default async function SharedClosureHistoryPage({
  params,
}: {
  params: Promise<{ token: string; closureId: string }>;
}) {
  const { token, closureId } = await params;
  const resolved = await resolveShareToken(token);
  if (resolved.status !== "ok") return <ShareUnavailable status={resolved.status} />;

  // С объектом муфты: иначе ссылка на объект открывала бы историю любой
  // муфты в базе.
  const loaded = await loadSharedClosure(resolved.link, closureId);
  if (loaded.status === "notfound") notFound();
  if (loaded.status === "forbidden") return <ShareUnavailable status="forbidden" />;
  const { closure } = loaded;
  const events = await closureHistory(closure.id, 200);

  return (
    <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="no-print border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-2 px-4 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{closure.project.name}</div>
            <div className="text-[11.5px] text-[var(--color-ink-400)]">
              Схема сварок · {shareCanEdit(resolved.link) ? "с правом правки" : "только просмотр"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/s/${token}/closure/${closure.id}`}
              className="btn btn-ghost px-2.5 py-1.5 text-[13px]"
            >
              ← К муфте
            </Link>
            <Link
              href={`/s/${token}/closure/${closure.id}/print`}
              className="btn btn-ghost px-2.5 py-1.5 text-[13px]"
            >
              Документ
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-5">
        <div className="mb-3">
          <h1 className="text-[18px] leading-tight">{closureTitle(closure)}</h1>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
            История изменений: кто и что менял в этой муфте.
          </p>
        </div>
        <HistoryList
          events={events.map(toHistoryItem)}
          emptyText="Изменений пока нет — история появится, как только муфту поправят."
        />
      </div>
    </div>
  );
}
