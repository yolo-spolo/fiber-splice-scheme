"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

  const splice = await prisma.splice.create({
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

  await prisma.fiber.updateMany({
    where: { id: { in: [d.fiberAId, d.fiberBId] } },
    data: { status: "SPLICED" },
  });

  revalidatePath(`/closures/${d.closureId}`);
  return { ok: true, spliceId: splice.id };
}

export async function deleteSplice(id: string) {
  const splice = await prisma.splice.delete({ where: { id } });
  for (const fiberId of [splice.fiberAId, splice.fiberBId]) {
    const remaining = await prisma.splice.count({
      where: { OR: [{ fiberAId: fiberId }, { fiberBId: fiberId }] },
    });
    if (remaining === 0) {
      await prisma.fiber.update({ where: { id: fiberId }, data: { status: "FREE" } });
    }
  }
  revalidatePath(`/closures/${splice.closureId}`);
  return { ok: true };
}

export async function updateSpliceLoss(id: string, lossDb: number | null) {
  const splice = await prisma.splice.update({ where: { id }, data: { lossDb } });
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
) {
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
  });

  revalidatePath(`/closures/${closureId}`);
  return { ok: true, count: pairs.length };
}

export async function setFiberStatus(fiberId: string, status: "FREE" | "TRANSIT" | "DAMAGED") {
  if (status === "FREE") {
    const linked = await prisma.splice.count({
      where: { OR: [{ fiberAId: fiberId }, { fiberBId: fiberId }] },
    });
    if (linked > 0) {
      return { error: "Волокно участвует в сварке — сначала удалите сварку" };
    }
  }
  const fiber = await prisma.fiber.update({
    where: { id: fiberId },
    data: { status },
    include: { cable: true },
  });
  revalidatePath(`/closures/${fiber.cable.closureId}`);
  return { ok: true };
}

/**
 * Смена цвета жилы. Разрешена в любой момент, в том числе для уже сваренного
 * волокна: на практике цвет уточняют прямо во время монтажа.
 */
export async function setFiberColor(fiberId: string, colorCode: number) {
  if (!Number.isInteger(colorCode) || colorCode < 0 || colorCode > 23) {
    return { error: "Некорректный цвет" };
  }
  const fiber = await prisma.fiber.update({
    where: { id: fiberId },
    data: { colorCode },
    include: { cable: true },
  });
  revalidatePath(`/closures/${fiber.cable.closureId}`);
  return { ok: true, colorCode };
}
