"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cableLayout, plural, suggestModuleCount } from "@/lib/cable-layout";
import { isColorScheme } from "@/lib/colors";

const presetSchema = z.object({
  name: z.string().trim().min(1, "Укажите название типа").max(80),
  fiberCount: z.coerce.number().int().min(1).max(1152),
  moduleCount: z.coerce.number().int().min(1).max(96),
  colorScheme: z
    .string()
    .optional()
    .transform((value) => (value && isColorScheme(value) ? value : "TIA598")),
  moduleColors: z
    .string()
    .optional()
    .transform((raw, ctx) => {
      if (!raw) return [] as number[];
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("not array");
        const codes = parsed.map((value) => Number(value));
        const valid = codes.every((value) => Number.isInteger(value) && value >= -1 && value < 24);
        if (!valid) throw new Error("bad values");
        return codes;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Некорректные цвета модулей" });
        return z.NEVER;
      }
    }),
  ownership: z.enum(["OURS", "FOREIGN"]).optional(),
  sheathColor: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional(),
});

function nullify(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Ёмкость модуля в типах кабелей тоже не вводится: она выводится из
 * количества волокон и модулей, как и в самом кабеле.
 */
function capacityFor(fiberCount: number, moduleCount: number) {
  const layout = cableLayout(fiberCount, moduleCount);
  if (!layout.fits) {
    return {
      error: `Не помещается: ${fiberCount} ${plural(
        fiberCount,
        "волокно",
        "волокна",
        "волокон",
      )} в ${moduleCount} ${plural(
        moduleCount,
        "модуль",
        "модуля",
        "модулей",
      )} по ${layout.moduleCapacity}. Нужно ${suggestModuleCount(fiberCount)} ${plural(
        suggestModuleCount(fiberCount),
        "модуль",
        "модуля",
        "модулей",
      )}.`,
    } as const;
  }
  return layout.moduleCapacity;
}

export async function createCableType(formData: FormData) {
  const parsed = presetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const data = parsed.data;
  const capacity = capacityFor(data.fiberCount, data.moduleCount);
  if (typeof capacity !== "number") return capacity;

  const duplicate = await prisma.cableTypePreset.findUnique({
    where: { name: data.name },
    select: { id: true },
  });
  if (duplicate) return { error: `Тип «${data.name}» уже есть` };

  const last = await prisma.cableTypePreset.aggregate({ _max: { order: true } });
  await prisma.cableTypePreset.create({
    data: {
      name: data.name,
      fiberCount: data.fiberCount,
      moduleCount: data.moduleCount,
      moduleCapacity: capacity,
      colorScheme: data.colorScheme,
      moduleColors: data.moduleColors,
      ownership: data.ownership ?? "OURS",
      sheathColor: nullify(data.sheathColor),
      note: nullify(data.note),
      order: (last._max.order ?? -1) + 1,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateCableType(id: string, formData: FormData) {
  const parsed = presetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const data = parsed.data;
  const capacity = capacityFor(data.fiberCount, data.moduleCount);
  if (typeof capacity !== "number") return capacity;

  const clash = await prisma.cableTypePreset.findFirst({
    where: { name: data.name, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: `Тип «${data.name}» уже есть` };

  await prisma.cableTypePreset.update({
    where: { id },
    data: {
      name: data.name,
      fiberCount: data.fiberCount,
      moduleCount: data.moduleCount,
      moduleCapacity: capacity,
      colorScheme: data.colorScheme,
      moduleColors: data.moduleColors,
      ownership: data.ownership ?? "OURS",
      sheathColor: nullify(data.sheathColor),
      note: nullify(data.note),
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteCableType(id: string) {
  await prisma.cableTypePreset.delete({ where: { id } });
  revalidatePath("/settings");
  return { ok: true };
}
