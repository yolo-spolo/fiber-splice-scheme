"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function createCassette(formData: FormData) {
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

  await prisma.cassette.create({
    data: {
      closureId: parsed.data.closureId,
      number,
      capacity: parsed.data.capacity ?? 12,
      label: parsed.data.label?.trim() || null,
    },
  });
  revalidatePath(`/closures/${parsed.data.closureId}`);
  return { ok: true };
}

export async function updateCassette(id: string, capacity: number, label?: string) {
  const cassette = await prisma.cassette.update({
    where: { id },
    data: { capacity, label: label?.trim() || null },
  });
  revalidatePath(`/closures/${cassette.closureId}`);
  return { ok: true };
}

export async function deleteCassette(id: string) {
  const cassette = await prisma.cassette.delete({ where: { id } });
  revalidatePath(`/closures/${cassette.closureId}`);
  return { ok: true };
}
