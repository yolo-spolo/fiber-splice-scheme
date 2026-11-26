"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildFibers,
  cableLayout,
  plural,
  suggestModuleCount,
} from "@/lib/cable-layout";
import { isColorScheme } from "@/lib/colors";
import { resolveCableEndpoint, type ClosureOption } from "@/lib/cable-endpoints";
import { resolveEditor } from "@/lib/edit-access";
import { logHistory } from "@/lib/history";

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
  colorScheme: colorSchemeSchema,
  colorOrder: colorOrderSchema,
  moduleColors: moduleColorsSchema,
  fromLocation: z.string().trim().max(120).optional(),
  toLocation: z.string().trim().max(120).optional(),
  fromClosureId: z.string().trim().optional(),
  toClosureId: z.string().trim().optional(),
  ownership: z.enum(["OURS", "FOREIGN"]).optional(),
  sheathColor: z.string().trim().max(40).optional(),
});

function nullify(v?: string) {
  const t = v?.trim();
  return t ? t : null;
}

/**
 * Муфты объекта для проверки концов кабеля. Возвращает и сам объект,
 * чтобы отклонить ссылку на муфту чужого объекта.
 */
async function closureOptions(closureId: string) {
  const closure = await prisma.closure.findUnique({
    where: { id: closureId },
    select: { projectId: true },
  });
  if (!closure) return null;
  const options = await prisma.closure.findMany({
    where: { projectId: closure.projectId },
    select: {
      id: true,
      number: true,
      kind: true,
      city: true,
      street: true,
      house: true,
      projectId: true,
    },
  });
  return { projectId: closure.projectId, options: options as ClosureOption[] };
}

/** Оба конца кабеля одной функцией: одинаковые правила для создания и правки. */
async function endpointsFor(
  closureId: string,
  d: { fromClosureId?: string; fromLocation?: string; toClosureId?: string; toLocation?: string },
) {
  const context = await closureOptions(closureId);
  if (!context) return { error: "Муфта не найдена" as const };

  const from = resolveCableEndpoint(
    { closureId: d.fromClosureId, location: d.fromLocation },
    context.options,
    context.projectId,
  );
  if ("error" in from) return { error: from.error };
  const to = resolveCableEndpoint(
    { closureId: d.toClosureId, location: d.toLocation },
    context.options,
    context.projectId,
  );
  if ("error" in to) return { error: to.error };

  return { from, to };
}

export async function createCable(formData: FormData, shareTokenArg?: string | null) {
  const shareToken = shareTokenArg ?? (String(formData.get("shareToken") ?? "") || null);
  const closureIdRaw = String(formData.get("closureId") ?? "");
  const auth = await resolveEditor(shareToken, closureIdRaw);
  if ("error" in auth) return { error: auth.error };

  const parsed = cableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const d = parsed.data;

  // Ёмкость модуля не вводится вручную: она выводится из двух чисел.
  const layout = cableLayout(d.fiberCount, d.moduleCount);
  if (!layout.fits) {
    return {
      error: `Не помещается: ${d.fiberCount} ${plural(
        d.fiberCount,
        "волокно",
        "волокна",
        "волокон",
      )} в ${d.moduleCount} ${plural(
        d.moduleCount,
        "модуль",
        "модуля",
        "модулей",
      )} по ${layout.moduleCapacity}. Нужно ${suggestModuleCount(d.fiberCount)} ${plural(
        suggestModuleCount(d.fiberCount),
        "модуль",
        "модуля",
        "модулей",
      )}.`,
    };
  }

  const dup = await prisma.cable.findFirst({
    where: { closureId: d.closureId, label: d.label },
    select: { id: true },
  });
  if (dup) return { error: `Кабель «${d.label}» уже добавлен` };

  const ends = await endpointsFor(d.closureId, d);
  if ("error" in ends) return { error: ends.error };

  const maxOrder = await prisma.cable.aggregate({
    where: { closureId: d.closureId },
    _max: { order: true },
  });

  const fibers = buildFibers(d.fiberCount, d.moduleCount, d.colorScheme, d.colorOrder);

  await prisma.$transaction(async (tx) => {
    const cable = await tx.cable.create({
      data: {
        closureId: d.closureId,
        label: d.label,
        type: nullify(d.type),
        fiberCount: d.fiberCount,
        moduleCount: layout.moduleCount,
        moduleCapacity: layout.moduleCapacity,
        colorScheme: d.colorScheme,
        colorOrder: d.colorOrder,
        moduleColors: d.moduleColors,
        fromLocation: ends.from.location,
        fromClosureId: ends.from.closureId,
        toLocation: ends.to.location,
        toClosureId: ends.to.closureId,
        ownership: d.ownership ?? "OURS",
        sheathColor: nullify(d.sheathColor),
        order: (maxOrder._max.order ?? -1) + 1,
        fibers: { create: fibers },
      },
      select: { id: true, label: true, fiberCount: true, moduleCount: true },
    });
    await logHistory(tx, auth.actor, d.closureId, {
      action: "cableCreate",
      summary: `${cable.label}: ${cable.fiberCount} волокон, ${cable.moduleCount} модулей`,
      targetId: cable.id,
    });
  });

  revalidatePath(`/closures/${d.closureId}`);
  return { ok: true };
}

export async function updateCable(id: string, formData: FormData, shareTokenArg?: string | null) {
  const shareToken = shareTokenArg ?? (String(formData.get("shareToken") ?? "") || null);
  const parsed = z
    .object({
      label: z.string().trim().min(1).max(60),
      type: z.string().trim().max(60).optional(),
      fiberCount: z.coerce.number().int().min(1).max(1152).optional(),
      moduleCount: z.coerce.number().int().min(1).max(96).optional(),
      colorScheme: colorSchemeSchema,
      colorOrder: colorOrderSchema,
      moduleColors: moduleColorsSchema,
      fromLocation: z.string().trim().max(120).optional(),
      toLocation: z.string().trim().max(120).optional(),
      fromClosureId: z.string().trim().optional(),
      toClosureId: z.string().trim().optional(),
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
  const auth = await resolveEditor(shareToken, cable.closureId);
  if ("error" in auth) return { error: auth.error };

  const beforeSnapshot = {
    label: cable.label,
    type: cable.type,
    fiberCount: cable.fiberCount,
    moduleCount: cable.moduleCount,
    fromLocation: cable.fromLocation,
    toLocation: cable.toLocation,
    ownership: cable.ownership,
    notes: cable.notes,
  };

  const duplicate = await prisma.cable.findFirst({
    where: { closureId: cable.closureId, label: d.label, NOT: { id } },
    select: { id: true },
  });
  if (duplicate) return { error: `Кабель «${d.label}» уже есть в этой муфте` };

  const ends = await endpointsFor(cable.closureId, d);
  if ("error" in ends) return { error: ends.error };

  const nextFiberCount = d.fiberCount ?? cable.fiberCount;
  const nextModuleCount = d.moduleCount ?? cable.moduleCount;
  // Ёмкость всегда выводится из волокон и модулей — и при изменении кабеля.
  const nextLayout = cableLayout(nextFiberCount, nextModuleCount);
  if (!nextLayout.fits) {
    return {
      error: `Не помещается: ${nextFiberCount} ${plural(
        nextFiberCount,
        "волокно",
        "волокна",
        "волокон",
      )} в ${nextModuleCount} ${plural(
        nextModuleCount,
        "модуль",
        "модуля",
        "модулей",
      )} по ${nextLayout.moduleCapacity}. Нужно ${suggestModuleCount(nextFiberCount)} ${plural(
        suggestModuleCount(nextFiberCount),
        "модуль",
        "модуля",
        "модулей",
      )}.`,
    };
  }
  const nextCapacity = nextLayout.moduleCapacity;
  const layoutChanged =
    nextFiberCount !== cable.fiberCount ||
    nextCapacity !== cable.moduleCapacity ||
    nextModuleCount !== cable.moduleCount ||
    (d.colorScheme ?? cable.colorScheme) !== cable.colorScheme ||
    JSON.stringify(d.colorOrder ?? []) !== JSON.stringify(cable.colorOrder);

  if (!layoutChanged) {
    const next = {
      label: d.label,
      type: nullify(d.type),
      fiberCount: cable.fiberCount,
      moduleCount: cable.moduleCount,
      fromLocation: ends.from.location,
      toLocation: ends.to.location,
      ownership: d.ownership ?? "OURS",
      notes: nullify(d.notes),
    };
    await prisma.$transaction(async (tx) => {
      await tx.cable.update({
        where: { id },
        data: {
          label: next.label,
          type: next.type,
          colorScheme: d.colorScheme ?? cable.colorScheme,
          colorOrder: d.colorOrder ?? cable.colorOrder,
          moduleColors: d.moduleColors ?? cable.moduleColors,
          fromLocation: next.fromLocation,
          fromClosureId: ends.from.closureId,
          toLocation: next.toLocation,
          toClosureId: ends.to.closureId,
          ownership: next.ownership,
          sheathColor: nullify(d.sheathColor),
          notes: next.notes,
        },
      });
      await logHistory(tx, auth.actor, cable.closureId, {
        action: "cableUpdate",
        summary: `${beforeSnapshot.label}${beforeSnapshot.label !== next.label ? ` → ${next.label}` : ""}`,
        before: beforeSnapshot,
        after: next,
        targetId: id,
      });
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
    nextModuleCount,
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
    nextModuleCount,
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
        fromLocation: ends.from.location,
        fromClosureId: ends.from.closureId,
        toLocation: ends.to.location,
        toClosureId: ends.to.closureId,
        ownership: d.ownership ?? "OURS",
        sheathColor: nullify(d.sheathColor),
        notes: nullify(d.notes),
      },
    });
    await logHistory(tx, auth.actor, cable.closureId, {
      action: "cableUpdate",
      summary: `${beforeSnapshot.label}${beforeSnapshot.label !== d.label ? ` → ${d.label}` : ""}, перестроены волокна`,
      before: beforeSnapshot,
      after: { ...beforeSnapshot, label: d.label, fiberCount: nextFiberCount, moduleCount: nextModuleCount },
      targetId: id,
    });
  });

  revalidatePath(`/closures/${cable.closureId}`);
  return { ok: true, rebuilt: true };
}

export async function deleteCable(id: string, shareToken?: string | null) {
  const cable = await prisma.cable.findUnique({
    where: { id },
    include: { fibers: { select: { id: true } } },
  });
  if (!cable) return { error: "Кабель не найден" };

  const auth = await resolveEditor(shareToken, cable.closureId);
  if ("error" in auth) return { error: auth.error };

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
    await logHistory(tx, auth.actor, cable.closureId, {
      action: "cableDelete",
      summary: `${cable.label} (${fiberIds.length} волокон)`,
      targetId: id,
    });
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
