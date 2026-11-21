"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildFibers, cableLayout, MODULE_CAPACITIES, plural } from "@/lib/cable-layout";
import { isColorScheme } from "@/lib/colors";

/** Массив цветов из формы: JSON-строка или повторяющиеся поля. */
const colorOrderSchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return [] as number[];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("not array");
      const codes = parsed
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value < 24);
      if (codes.length !== parsed.length) throw new Error("bad values");
      return codes;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Некорректная цветовка" });
      return z.NEVER;
    }
  });

const colorSchemeSchema = z
  .string()
  .optional()
  .transform((value) => (value && isColorScheme(value) ? value : "TIA598"));

/**
 * Цвета модулей из формы. -1 — «авто по схеме», 0..23 — назначено вручную.
 * Пустая строка означает «все модули по стандарту».
 */
const moduleColorsSchema = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (!raw) return [] as number[];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("not array");
      const codes = parsed.map((value) => Number(value));
      const valid = codes.every(
        (value) => Number.isInteger(value) && value >= -1 && value < 24,
      );
      if (!valid) throw new Error("bad values");
      return codes;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Некорректные цвета модулей" });
      return z.NEVER;
    }
  });

const moduleCapacitySchema = z
  .coerce
  .number()
  .int()
  .refine((value) => (MODULE_CAPACITIES as readonly number[]).includes(value), {
    message: `Волокон в модуле: допустимо ${MODULE_CAPACITIES.join(", ")}`,
  });

const cableSchema = z.object({
  closureId: z.string().min(1),
  label: z.string().trim().min(1, "Укажите метку кабеля").max(60),
  type: z.string().trim().max(60).optional(),
  fiberCount: z.coerce
    .number({ message: "Укажите количество волокон" })
    .int("Волокон должно быть целое число")
    .min(1, "Волокон должно быть хотя бы 1")
    .max(1152, "Не больше 1152 волокон"),
  moduleCount: z.coerce
    .number({ message: "Укажите количество модулей" })
    .int("Модулей должно быть целое число")
    .min(1, "Модулей должно быть хотя бы 1")
    .max(96, "Не больше 96 модулей"),
  moduleCapacity: moduleCapacitySchema,
  colorScheme: colorSchemeSchema,
  colorOrder: colorOrderSchema,
  moduleColors: moduleColorsSchema,
  fromLocation: z.string().trim().max(120).optional(),
  toLocation: z.string().trim().max(120).optional(),
  ownership: z.enum(["OURS", "FOREIGN"]).optional(),
  sheathColor: z.string().trim().max(40).optional(),
});

function nullify(v?: string) {
  const t = v?.trim();
  return t ? t : null;
}

export async function createCable(formData: FormData) {
  const parsed = cableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const d = parsed.data;

  const layout = cableLayout(d.fiberCount, d.moduleCount, d.moduleCapacity);
  if (!layout.fits) {
    return {
      error: `Не помещается: ${d.fiberCount} волокон в ${d.moduleCount} × ${d.moduleCapacity} = ${layout.capacity}. Добавьте модуль или уменьшите количество волокон.`,
    };
  }

  const dup = await prisma.cable.findFirst({
    where: { closureId: d.closureId, label: d.label },
    select: { id: true },
  });
  if (dup) return { error: `Кабель «${d.label}» уже добавлен` };

  const maxOrder = await prisma.cable.aggregate({
    where: { closureId: d.closureId },
    _max: { order: true },
  });

  const fibers = buildFibers(d.fiberCount, d.moduleCapacity, d.colorScheme, d.colorOrder);

  await prisma.cable.create({
    data: {
      closureId: d.closureId,
      label: d.label,
      type: nullify(d.type),
      fiberCount: d.fiberCount,
      moduleCount: layout.moduleCount,
      moduleCapacity: d.moduleCapacity,
      colorScheme: d.colorScheme,
      colorOrder: d.colorOrder,
      moduleColors: d.moduleColors,
      fromLocation: nullify(d.fromLocation),
      toLocation: nullify(d.toLocation),
      ownership: d.ownership ?? "OURS",
      sheathColor: nullify(d.sheathColor),
      order: (maxOrder._max.order ?? -1) + 1,
      fibers: { create: fibers },
    },
  });

  revalidatePath(`/closures/${d.closureId}`);
  return { ok: true };
}

export async function updateCable(id: string, formData: FormData) {
  const parsed = z
    .object({
      label: z.string().trim().min(1).max(60),
      type: z.string().trim().max(60).optional(),
      fiberCount: z.coerce.number().int().min(1).max(1152).optional(),
      moduleCount: z.coerce.number().int().min(1).max(96).optional(),
      moduleCapacity: moduleCapacitySchema.optional(),
      colorScheme: colorSchemeSchema,
      colorOrder: colorOrderSchema,
      moduleColors: moduleColorsSchema,
      fromLocation: z.string().trim().max(120).optional(),
      toLocation: z.string().trim().max(120).optional(),
      ownership: z.enum(["OURS", "FOREIGN"]).optional(),
      sheathColor: z.string().trim().max(40).optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const d = parsed.data;

  const cable = await prisma.cable.findUnique({
    where: { id },
    include: {
      fibers: {
        orderBy: [{ moduleIndex: "asc" }, { position: "asc" }],
        include: {
          splicesA: { select: { id: true } },
          splicesB: { select: { id: true } },
        },
      },
    },
  });
  if (!cable) return { error: "Кабель не найден" };

  const duplicate = await prisma.cable.findFirst({
    where: { closureId: cable.closureId, label: d.label, NOT: { id } },
    select: { id: true },
  });
  if (duplicate) return { error: `Кабель «${d.label}» уже есть в этой муфте` };

  const nextFiberCount = d.fiberCount ?? cable.fiberCount;
  const nextCapacity = d.moduleCapacity ?? cable.moduleCapacity;
  const nextModuleCount = d.moduleCount ?? cable.moduleCount;
  const nextLayout = cableLayout(nextFiberCount, nextModuleCount, nextCapacity);
  if (!nextLayout.fits) {
    return {
      error: `Не помещается: ${nextFiberCount} волокон в ${nextModuleCount} × ${nextCapacity} = ${nextLayout.capacity}. Добавьте модуль или уменьшите количество волокон.`,
    };
  }
  const layoutChanged =
    nextFiberCount !== cable.fiberCount ||
    nextCapacity !== cable.moduleCapacity ||
    nextModuleCount !== cable.moduleCount ||
    (d.colorScheme ?? cable.colorScheme) !== cable.colorScheme ||
    JSON.stringify(d.colorOrder ?? []) !== JSON.stringify(cable.colorOrder);

  if (!layoutChanged) {
    await prisma.cable.update({
      where: { id },
      data: {
        label: d.label,
        type: nullify(d.type),
        colorScheme: d.colorScheme ?? cable.colorScheme,
        colorOrder: d.colorOrder ?? cable.colorOrder,
        moduleColors: d.moduleColors ?? cable.moduleColors,
        fromLocation: nullify(d.fromLocation),
        toLocation: nullify(d.toLocation),
        ownership: d.ownership ?? "OURS",
        sheathColor: nullify(d.sheathColor),
        notes: nullify(d.notes),
      },
    });
    revalidatePath(`/closures/${cable.closureId}`);
    return { ok: true };
  }

  // Перестройка волокон: сохраняем те, что уже сварены, и добавляем недостающие.
  // Сваренные волокна нельзя удалить — иначе схема потеряет соединения.
  const splicedIds = new Set(
    cable.fibers.flatMap((f) => [
      ...(f.splicesA.length ? [f.id] : []),
      ...(f.splicesB.length ? [f.id] : []),
    ]),
  );
  const planned = buildFibers(
    nextFiberCount,
    nextCapacity,
    d.colorScheme ?? cable.colorScheme,
    d.colorOrder ?? cable.colorOrder,
  );
  const plannedKeys = new Set(planned.map((f) => `${f.moduleIndex}:${f.position}`));

  const removed = cable.fibers.filter((f) => !plannedKeys.has(`${f.moduleIndex}:${f.position}`));
  const removedSpliced = removed.filter((f) => splicedIds.has(f.id));
  if (removedSpliced.length > 0) {
    return {
      error: `Нельзя уменьшить: ${removedSpliced.length} ${plural(
        removedSpliced.length,
        "волокно уже сварено",
        "волокна уже сварены",
        "волокон уже сварены",
      )}. Сначала удалите ${plural(removedSpliced.length, "его сварку", "их сварки", "их сварки")}.`,
    };
  }

  const existingKeys = new Set(cable.fibers.map((f) => `${f.moduleIndex}:${f.position}`));
  const toCreate = planned.filter((f) => !existingKeys.has(`${f.moduleIndex}:${f.position}`));

  // Смена цветовки перекрашивает только те волокна, у которых цвет ещё
  // совпадает со схемой. Вручную изменённые цвета не затираются.
  const previousPalette = buildFibers(
    nextFiberCount,
    nextCapacity,
    cable.colorScheme,
    cable.colorOrder,
  );
  const previousByKey = new Map(
    previousPalette.map((f) => [`${f.moduleIndex}:${f.position}`, f.colorCode]),
  );
  const recolor = planned
    .map((f) => {
      const existing = cable.fibers.find(
        (item) => item.moduleIndex === f.moduleIndex && item.position === f.position,
      );
      if (!existing) return null;
      if (existing.colorCode !== previousByKey.get(`${f.moduleIndex}:${f.position}`)) return null;
      if (existing.colorCode === f.colorCode) return null;
      return { id: existing.id, colorCode: f.colorCode };
    })
    .filter((item): item is { id: string; colorCode: number } => item !== null);

  await prisma.$transaction(async (tx) => {
    if (removed.length > 0) {
      await tx.fiber.deleteMany({ where: { id: { in: removed.map((f) => f.id) } } });
    }
    if (toCreate.length > 0) {
      await tx.fiber.createMany({ data: toCreate.map((f) => ({ ...f, cableId: id })) });
    }
    for (const item of recolor) {
      await tx.fiber.update({ where: { id: item.id }, data: { colorCode: item.colorCode } });
    }
    await tx.cable.update({
      where: { id },
      data: {
        label: d.label,
        type: nullify(d.type),
        fiberCount: nextFiberCount,
        moduleCapacity: nextCapacity,
        moduleCount: nextModuleCount,
        colorScheme: d.colorScheme ?? cable.colorScheme,
        colorOrder: d.colorOrder ?? cable.colorOrder,
        moduleColors: d.moduleColors ?? cable.moduleColors,
        fromLocation: nullify(d.fromLocation),
        toLocation: nullify(d.toLocation),
        ownership: d.ownership ?? "OURS",
        sheathColor: nullify(d.sheathColor),
        notes: nullify(d.notes),
      },
    });
  });

  revalidatePath(`/closures/${cable.closureId}`);
  return { ok: true, rebuilt: true };
}

export async function deleteCable(id: string) {
  const cable = await prisma.cable.findUnique({
    where: { id },
    include: { fibers: { select: { id: true } } },
  });
  if (!cable) return { error: "Кабель не найден" };

  const fiberIds = cable.fibers.map((fiber) => fiber.id);

  // Удаляем сварки кабеля, затем его самого. Иначе волокна второй стороны
  // останутся в статусе «сварено» без существующей сварки.
  await prisma.$transaction(async (tx) => {
    if (fiberIds.length > 0) {
      await tx.splice.deleteMany({
        where: { OR: [{ fiberAId: { in: fiberIds } }, { fiberBId: { in: fiberIds } }] },
      });
    }
    await tx.cable.delete({ where: { id } });
  });

  // Волокна чужого кабеля, потерявшие сварку, возвращаем в «свободно».
  if (fiberIds.length > 0) {
    await prisma.fiber.updateMany({
      where: { splicesA: { none: {} }, splicesB: { none: {} }, status: "SPLICED" },
      data: { status: "FREE" },
    });
  }

  revalidatePath(`/closures/${cable.closureId}`);
  return { ok: true };
}
