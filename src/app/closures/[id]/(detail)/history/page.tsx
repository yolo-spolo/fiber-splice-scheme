import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { closureHistory } from "@/lib/history";
import { toHistoryItem } from "@/lib/history-labels";
import { HistoryList } from "@/components/history-list";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  const events = await closureHistory(closure.id, 200);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[16px]">История изменений</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
          Кто и что менял в муфте: владелец или гость по ссылке с правом правки.
        </p>
      </div>
      <HistoryList events={events.map(toHistoryItem)} canRestore />
    </div>
  );
}
