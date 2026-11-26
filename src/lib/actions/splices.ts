"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveEditor } from "@/lib/edit-access";
import { logHistory } from "@/lib/history";

const createSchema = z.object({
  closureId: z.string().min(1),
  fiberAId: z.string().min(1),
  fiberBId: z.string().min(1),
  cassetteId: z.string().optional(),
  kind: z.enum(["FUSION", "MECHANICAL", "PIGTAIL", "SPLITTER", "TRANSIT"]).optional(),
  lossDb: z.union([z.coerce.number().min(0).max(99), z.literal("")]).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function createSplice(formData: FormData) {
  const shareToken = String(formData.get("shareToken") ?? "") || null;
  const auth = await resolveEditor(shareToken, String(formData.get("closureId") ?? ""));
  if ("error" in auth) return { error: auth.error };

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Проверьте данные сварки" };
  const d = parsed.data;

  if (d.fiberAId === d.fiberBId) return { error: "Нельзя сварить волокно с самим собой" };

  const [fiberA, fiberB] = await Promise.all([
    prisma.fiber.findUnique({ where: { id: d.fiberAId }, include: { cable: true } }),
    prisma.fiber.findUnique({ where: { id: d.fiberBId }, include: { cable: true } }),
  ]);
  if (!fiberA || !fiberB) return { error: "Волокно не найдено" };
  if (fiberA.cable.closureId !== d.closureId || fiberB.cable.closureId !== d.closureId) {
    return { error: "Волокна из другой муфты" };
  }

  const busy = await prisma.splice.findFirst({
    where: {
      OR: [
        { fiberAId: { in: [d.fiberAId, d.fiberBId] } },
        { fiberBId: { in: [d.fiberAId, d.fiberBId] } },
      ],
    },
    include: { fiberA: { include: { cable: true } }, fiberB: { include: { cable: true } } },
  });
  if (busy) {
    return {
      error: `Волокно уже сварено: ${busy.fiberA.cable.label} М${busy.fiberA.moduleIndex} В${busy.fiberA.position} ↔ ${busy.fiberB.cable.label} М${busy.fiberB.moduleIndex} В${busy.fiberB.position}`,
    };
  }

  const fiberName = (fiber: typeof fiberA) => `${fiber.cable.label} М${fiber.moduleIndex} В${fiber.position}`;

  const splice = await prisma.$transaction(async (tx) => {
    const created = await tx.splice.create({
      data: {
        closureId: d.closureId,
        fiberAId: d.fiberAId,
        fiberBId: d.fiberBId,
        cassetteId: d.cassetteId || null,
        kind: d.kind ?? "FUSION",
        lossDb: d.lossDb === "" || d.lossDb == null ? null : Number(d.lossDb),
        note: d.note?.trim() || null,
        splicedAt: new Date(),
      },
    });
    await tx.fiber.updateMany({
      where: { id: { in: [d.fiberAId, d.fiberBId] } },
      data: { status: "SPLICED" },
    });
    await logHistory(tx, auth.actor, d.closureId, {
      action: "spliceCreate",
      summary: `${fiberName(fiberA)} ↔ ${fiberName(fiberB)}`,
      after: { fiberAId: d.fiberAId, fiberBId: d.fiberBId, kind: d.kind ?? "FUSION" },
      targetId: created.id,
    });
    return created;
  });

  revalidatePath(`/closures/${d.closureId}`);
  return { ok: true, spliceId: splice.id };
}

export async function deleteSplice(id: string, shareToken?: string | null) {
  const existing = await prisma.splice.findUnique({
    where: { id },
    include: {
      fiberA: { include: { cable: true } },
      fiberB: { include: { cable: true } },
    },
  });
  if (!existing) return { error: "Сварка не найдена" };

  const auth = await resolveEditor(shareToken, existing.closureId);
  if ("error" in auth) return { error: auth.error };

  const splice = await prisma.$transaction(async (tx) => {
    const removed = await tx.splice.delete({ where: { id } });
    for (const fiberId of [removed.fiberAId, removed.fiberBId]) {
      const remaining = await tx.splice.count({
        where: { OR: [{ fiberAId: fiberId }, { fiberBId: fiberId }] },
      });
      if (remaining === 0) {
        await tx.fiber.update({ where: { id: fiberId }, data: { status: "FREE" } });
      }
    }
    await logHistory(tx, auth.actor, removed.closureId, {
      action: "spliceDelete",
      summary: `${existing.fiberA.cable.label} М${existing.fiberA.moduleIndex} В${existing.fiberA.position} ↔ ${existing.fiberB.cable.label} М${existing.fiberB.moduleIndex} В${existing.fiberB.position}`,
      targetId: removed.id,
    });
    return removed;
  });
  revalidatePath(`/closures/${splice.closureId}`);
  return { ok: true };
}

export async function updateSpliceLoss(id: string, lossDb: number | null, shareToken?: string | null) {
  const existing = await prisma.splice.findUnique({ where: { id }, select: { closureId: true, lossDb: true } });
  if (!existing) return { error: "Сварка не найдена" };
  const auth = await resolveEditor(shareToken, existing.closureId);
  if ("error" in auth) return { error: auth.error };

  const splice = await prisma.$transaction(async (tx) => {
    const updated = await tx.splice.update({ where: { id }, data: { lossDb } });
    await logHistory(tx, auth.actor, updated.closureId, {
      action: "spliceLoss",
      summary: `${existing.lossDb ?? "—"} → ${lossDb ?? "—"} дБ`,
      before: { lossDb: existing.lossDb },
      after: { lossDb },
      targetId: id,
    });
    return updated;
  });
  revalidatePath(`/closures/${splice.closureId}`);
  return { ok: true };
}

/**
 * Прямая автосварка: сопоставляет свободные волокна двух кабелей по порядку
 * (1-е с 1-м, 2-е со 2-м и т.д.). Так 12-волоконный кабель корректно
 * сваривается с освободившимся модулем 24-волоконного — как делают на практике.
 */
export async function autoSpliceStraight(
  closureId: string,
  cableAId: string,
  cableBId: string,
  cassetteId?: string,
  shareToken?: string | null,
) {
  const auth = await resolveEditor(shareToken, closureId);
  if ("error" in auth) return { error: auth.error };
  if (cableAId === cableBId) return { error: "Выберите два разных кабеля" };

  const [fibersA, fibersB] = await Promise.all([
    prisma.fiber.findMany({
      where: { cableId: cableAId },
      orderBy: [{ moduleIndex: "asc" }, { position: "asc" }],
    }),
    prisma.fiber.findMany({
      where: { cableId: cableBId },
      orderBy: [{ moduleIndex: "asc" }, { position: "asc" }],
    }),
  ]);

  const occupied = await prisma.splice.findMany({
    where: {
      OR: [
        { fiberA: { cableId: { in: [cableAId, cableBId] } } },
        { fiberB: { cableId: { in: [cableAId, cableBId] } } },
      ],
    },
    select: { fiberAId: true, fiberBId: true },
  });
  const busy = new Set(occupied.flatMap((s) => [s.fiberAId, s.fiberBId]));

  const freeA = fibersA.filter((f) => !busy.has(f.id));
  const freeB = fibersB.filter((f) => !busy.has(f.id));
  const pairs: { a: string; b: string }[] = [];
  const limit = Math.min(freeA.length, freeB.length);
  for (let i = 0; i < limit; i += 1) {
    pairs.push({ a: freeA[i].id, b: freeB[i].id });
  }

  if (pairs.length === 0) return { error: "Нет свободных пар для прямой сварки" };

  await prisma.$transaction(async (tx) => {
    for (const p of pairs) {
      await tx.splice.create({
        data: {
          closureId,
          fiberAId: p.a,
          fiberBId: p.b,
          cassetteId: cassetteId || null,
          kind: "FUSION",
          splicedAt: new Date(),
        },
      });
    }
    await tx.fiber.updateMany({
      where: { id: { in: pairs.flatMap((p) => [p.a, p.b]) } },
      data: { status: "SPLICED" },
    });
    // Автосварка — одна запись на пачку: иначе история из 12 строк на кнопку
    // вытеснит всё остальное и её невозможно будет прочитать.
    await logHistory(tx, auth.actor, closureId, {
      action: "spliceCreate",
      summary: `прямая сварка: ${pairs.length} пар`,
      after: { pairs: pairs.length },
    });
  });

  revalidatePath(`/closures/${closureId}`);
  return { ok: true, count: pairs.length };
}

export async function setFiberStatus(
  fiberId: string,
  status: "FREE" | "TRANSIT" | "DAMAGED",
  shareToken?: string | null,
) {
  if (status === "FREE") {
    const linked = await prisma.splice.count({
      where: { OR: [{ fiberAId: fiberId }, { fiberBId: fiberId }] },
    });
    if (linked > 0) {
      return { error: "Волокно участвует в сварке — сначала удалите сварку" };
    }
  }
  const current = await prisma.fiber.findUnique({
    where: { id: fiberId },
    include: { cable: true },
  });
  if (!current) return { error: "Волокно не найдено" };

  const auth = await resolveEditor(shareToken, current.cable.closureId);
  if ("error" in auth) return { error: auth.error };

  const fiber = await prisma.$transaction(async (tx) => {
    const updated = await tx.fiber.update({
      where: { id: fiberId },
      data: { status },
      include: { cable: true },
    });
    await logHistory(tx, auth.actor, updated.cable.closureId, {
      action: "fiberStatus",
      summary: `${updated.cable.label} М${updated.moduleIndex} В${updated.position}: ${current.status} → ${status}`,
      before: { status: current.status },
      after: { status },
      targetId: fiberId,
    });
    return updated;
  });
  revalidatePath(`/closures/${fiber.cable.closureId}`);
  return { ok: true };
}

/**
 * Смена цвета жилы. Разрешена в любой момент, в том числе для уже сваренного
 * волокна: на практике цвет уточняют прямо во время монтажа.
 */
export async function setFiberColor(fiberId: string, colorCode: number, shareToken?: string | null) {
  if (!Number.isInteger(colorCode) || colorCode < 0 || colorCode > 23) {
    return { error: "Некорректный цвет" };
  }
  const current = await prisma.fiber.findUnique({
    where: { id: fiberId },
    include: { cable: true },
  });
  if (!current) return { error: "Волокно не найдено" };

  const auth = await resolveEditor(shareToken, current.cable.closureId);
  if ("error" in auth) return { error: auth.error };

  const fiber = await prisma.$transaction(async (tx) => {
    const updated = await tx.fiber.update({
      where: { id: fiberId },
      data: { colorCode },
      include: { cable: true },
    });
    await logHistory(tx, auth.actor, updated.cable.closureId, {
      action: "fiberColor",
      summary: `${updated.cable.label} М${updated.moduleIndex} В${updated.position}: ${current.colorCode} → ${colorCode}`,
      before: { colorCode: current.colorCode },
      after: { colorCode },
      targetId: fiberId,
    });
    return updated;
  });
  revalidatePath(`/closures/${fiber.cable.closureId}`);
  return { ok: true, colorCode };
}

/**
 * Подпись волокна — «для какого абонента или объекта». Пишется в Fiber.label
 * и попадает в документ: по подписи монтажник находит нужную жилу быстрее,
 * чем по номеру модуля и позиции.
 */
export async function setFiberLabel(fiberId: string, label: string, shareToken?: string | null) {
  const current = await prisma.fiber.findUnique({
    where: { id: fiberId },
    include: { cable: true },
  });
  if (!current) return { error: "Волокно не найдено" };

  const auth = await resolveEditor(shareToken, current.cable.closureId);
  if ("error" in auth) return { error: auth.error };

  const next = label.replace(/\s+/g, " ").trim().slice(0, 120) || null;
  if (next === current.label) return { ok: true, label: next };

  const fiber = await prisma.$transaction(async (tx) => {
    const updated = await tx.fiber.update({
      where: { id: fiberId },
      data: { label: next },
      include: { cable: true },
    });
    await logHistory(tx, auth.actor, updated.cable.closureId, {
      action: "fiberLabel",
      summary: `${updated.cable.label} М${updated.moduleIndex} В${updated.position}: ${current.label ?? "без подписи"} → ${next ?? "без подписи"}`,
      before: { label: current.label },
      after: { label: next },
      targetId: fiberId,
    });
    return updated;
  });
  revalidatePath(`/closures/${fiber.cable.closureId}`);
  revalidatePath(`/closures/${fiber.cable.closureId}/splice`);
  return { ok: true, label: next };
}
