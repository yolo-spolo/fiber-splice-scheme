"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hasValidSession } from "@/lib/session";
import { logHistory, RESTORABLE, type HistoryAction } from "@/lib/history";
import { actionLabel } from "@/lib/history-labels";

/**
 * Возврат одного изменённого поля. Только владелец и только для действий из
 * RESTORABLE: создание и удаление не откатываются, иначе можно получить
 * сварку без волокна или кабель с половиной волокон.
 */
export async function restoreEvent(eventId: string) {
  if (!(await hasValidSession())) return { error: "Возвращать изменения может только владелец" };

  const event = await prisma.closureEvent.findUnique({ where: { id: eventId } });
  if (!event) return { error: "Запись истории не найдена" };

  const action = event.action as HistoryAction;
  const target = RESTORABLE[action];
  if (!target) return { error: "Это изменение нельзя вернуть" };

  const before = (event.before ?? {}) as Record<string, unknown>;
  // У правки самой муфты отдельной записи нет — цель и есть сама муфта.
  const targetId =
    typeof before.targetId === "string"
      ? before.targetId
      : target === "closure"
        ? event.closureId
        : null;
  if (!targetId) return { error: "В записи нет ссылки на объект изменения" };

  const restored = await prisma.$transaction(async (tx) => {
    if (target === "closure") {
      const data = pick(before, [
        "number",
        "kind",
        "model",
        "city",
        "street",
        "house",
        "lat",
        "lng",
        "notes",
        "status",
      ]);
      await tx.closure.update({ where: { id: event.closureId }, data });
      return data;
    }
    if (target === "fiber") {
      const data = pick(before, ["status", "colorCode", "label"]);
      await tx.fiber.update({ where: { id: targetId }, data });
      return data;
    }
    if (target === "splice") {
      const data = pick(before, ["lossDb"]);
      await tx.splice.update({ where: { id: targetId }, data });
      return data;
    }
    const data = pick(before, ["capacity", "label"]);
    await tx.cassette.update({ where: { id: targetId }, data });
    return data;
  });

  await prisma.$transaction(async (tx) => {
    await logHistory(
      tx,
      { kind: "owner", name: "Владелец", shareId: null },
      event.closureId,
      {
        action,
        // Не повторяем текст исходной правки: «возврат: Сдана → Черновик»
        // читается наоборот. Достаточно сказать, что именно вернули.
        summary: `возврат — ${actionLabel(action).toLowerCase()}`,
        after: restored as never,
        targetId: targetId ?? undefined,
      },
    );
  });

  revalidatePath(`/closures/${event.closureId}`);
  revalidatePath(`/closures/${event.closureId}/history`);
  return { ok: true };
}

/** Только известные поля: запись истории не должна уметь править что угодно. */
function pick(source: Record<string, unknown>, keys: string[]) {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in source) result[key] = source[key];
  }
  return result;
}
