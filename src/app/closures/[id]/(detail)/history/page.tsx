import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { closureHistory, RESTORABLE } from "@/lib/history";
import { actionLabel, actorLabel } from "@/lib/history-labels";
import { HistoryList } from "./history-list";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  const events = await closureHistory(closure.id, 200);

  return (
    <HistoryList
      closureId={closure.id}
      events={events.map((event) => ({
        id: event.id,
        actorKind: event.actorKind,
        actorName: event.actorName,
        action: event.action,
        actionLabel: actionLabel(event.action),
        summary: event.summary,
        createdAt: event.createdAt.toISOString(),
        restorable: Boolean(RESTORABLE[event.action as keyof typeof RESTORABLE]),
      }))}
    />
  );
}
