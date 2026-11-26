"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveEditor } from "@/lib/edit-access";
import { logHistory } from "@/lib/history";

export async function createCassette(formData: FormData) {
  const shareToken = String(formData.get("shareToken") ?? "") || null;
  const auth = await resolveEditor(shareToken, String(formData.get("closureId") ?? ""));
  if ("error" in auth) return { error: auth.error };

  const parsed = z
    .object({
      closureId: z.string().min(1),
      number: z.coerce.number().int().min(1).max(99).optional(),
      capacity: z.coerce.number().int().min(1).max(96).optional(),
      label: z.string().trim().max(80).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Проверьте поля" };

  const last = await prisma.cassette.aggregate({
    where: { closureId: parsed.data.closureId },
    _max: { number: true },
  });
  const number = parsed.data.number ?? (last._max.number ?? 0) + 1;

  const dup = await prisma.cassette.findFirst({
    where: { closureId: parsed.data.closureId, number },
    select: { id: true },
  });
  if (dup) return { error: `Кассета ${number} уже существует` };

  await prisma.$transaction(async (tx) => {
    const cassette = await tx.cassette.create({
      data: {
        closureId: parsed.data.closureId,
        number,
        capacity: parsed.data.capacity ?? 12,
        label: parsed.data.label?.trim() || null,
      },
    });
    await logHistory(tx, auth.actor, parsed.data.closureId, {
      action: "cassetteCreate",
      summary: `кассета ${cassette.number}, ёмкость ${cassette.capacity}`,
      targetId: cassette.id,
    });
  });
  revalidatePath(`/closures/${parsed.data.closureId}`);
  return { ok: true };
}

export async function updateCassette(
  id: string,
  capacity: number,
  label?: string,
  shareToken?: string | null,
) {
  const current = await prisma.cassette.findUnique({ where: { id } });
  if (!current) return { error: "Кассета не найдена" };
  const auth = await resolveEditor(shareToken, current.closureId);
  if ("error" in auth) return { error: auth.error };

  const nextLabel = label?.trim() || null;
  const cassette = await prisma.$transaction(async (tx) => {
    const updated = await tx.cassette.update({
      where: { id },
      data: { capacity, label: nextLabel },
    });
    await logHistory(tx, auth.actor, updated.closureId, {
      action: "cassetteUpdate",
      summary: `кассета ${updated.number}: ёмкость ${current.capacity} → ${capacity}${current.label !== nextLabel ? ", подпись изменена" : ""}`,
      before: { capacity: current.capacity, label: current.label },
      after: { capacity, label: nextLabel },
      targetId: id,
    });
    return updated;
  });
  revalidatePath(`/closures/${cassette.closureId}`);
  return { ok: true };
}

export async function deleteCassette(id: string, shareToken?: string | null) {
  const current = await prisma.cassette.findUnique({
    where: { id },
    include: { _count: { select: { splices: true } } },
  });
  if (!current) return { error: "Кассета не найдена" };
  const auth = await resolveEditor(shareToken, current.closureId);
  if ("error" in auth) return { error: auth.error };

  const cassette = await prisma.$transaction(async (tx) => {
    const removed = await tx.cassette.delete({ where: { id } });
    await logHistory(tx, auth.actor, removed.closureId, {
      action: "cassetteDelete",
      summary: `кассета ${removed.number} (${current._count.splices} сварок остались без кассеты)`,
      targetId: id,
    });
    return removed;
  });
  revalidatePath(`/closures/${cassette.closureId}`);
  return { ok: true };
}
