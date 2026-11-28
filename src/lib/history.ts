import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EditActor } from "@/lib/edit-access";
import type { HistoryAction } from "@/lib/history-labels";

export { HISTORY_ACTIONS, RESTORABLE, actionLabel, actorLabel } from "@/lib/history-labels";
export type { HistoryAction } from "@/lib/history-labels";

export type HistoryEntry = {
  action: HistoryAction;
  summary: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  targetId?: string;
};

/**
 * Запись истории. Вызывать внутри той же транзакции, что и само изменение:
 * иначе журнал разойдётся со схемой, если запись упадёт.
 */
export async function logHistory(
  tx: Prisma.TransactionClient,
  actor: EditActor,
  closureId: string,
  entry: HistoryEntry,
) {
  const before = entry.targetId
    ? ({ ...(entry.before as object), targetId: entry.targetId } as Prisma.InputJsonValue)
    : entry.before;
  await tx.closureEvent.create({
    data: {
      closureId,
      actorKind: actor.kind === "owner" ? "OWNER" : "GUEST",
      actorName: actor.name,
      shareId: actor.shareId,
      action: entry.action,
      summary: entry.summary,
      before: before ?? undefined,
      after: entry.after ?? undefined,
    },
  });
}

/** История муфты для вкладки и документа: свежие сверху. */
export async function closureHistory(closureId: string, take = 50) {
  return prisma.closureEvent.findMany({
    where: { closureId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export type HistoryRow = Awaited<ReturnType<typeof closureHistory>>[number];
