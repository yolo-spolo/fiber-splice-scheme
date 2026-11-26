"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CLOSURE_KINDS } from "@/lib/cable-types";
import { resolveEditor } from "@/lib/edit-access";
import { logHistory } from "@/lib/history";
import { hasValidSession } from "@/lib/session";
import { STATUS_LABELS } from "@/lib/labels";

const closureSchema = z.object({
  projectId: z.string().min(1),
  number: z.string().trim().min(1, "Укажите номер муфты").max(60),
  kind: z.string().trim().min(1),
  model: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  street: z.string().trim().max(160).optional(),
  house: z.string().trim().max(40).optional(),
  lat: z.union([z.coerce.number().min(-90).max(90), z.literal("")]).optional(),
  lng: z.union([z.coerce.number().min(-180).max(180), z.literal("")]).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function nullify(v?: string) {
  const t = v?.trim();
  return t ? t : null;
}

/**
 * Координаты приходят из формы двумя полями, но вводятся одной строкой
 * в PostalAddressFields. Пустая половина означает «координат нет» — не
 * сохраняем половинчатую точку, иначе карта покажет чужое место.
 */
function parseCoordPair(
  lat?: number | "",
  lng?: number | "",
): { lat: number | null; lng: number | null } | { error: string } {
  const hasLat = lat !== "" && lat != null;
  const hasLng = lng !== "" && lng != null;
  if (!hasLat && !hasLng) return { lat: null, lng: null };
  if (!hasLat || !hasLng) {
    return { error: "Укажите обе координаты: широту и долготу через запятую" };
  }
  const pair = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(pair.lat) || !Number.isFinite(pair.lng)) {
    return { error: "Координаты должны быть числами" };
  }
  if (Math.abs(pair.lat) > 90) return { error: "Широта должна быть от -90 до 90" };
  if (Math.abs(pair.lng) > 180) return { error: "Долгота должна быть от -180 до 180" };
  return pair;
}

export async function createClosure(formData: FormData) {
  const parsed = closureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const d = parsed.data;
  const kind = (CLOSURE_KINDS as readonly string[]).includes(d.kind) ? d.kind : "МУФТА";
  const coords = parseCoordPair(d.lat, d.lng);
  if ("error" in coords) return { error: coords.error };

  const exists = await prisma.closure.findFirst({
    where: { projectId: d.projectId, number: d.number },
    select: { id: true },
  });
  if (exists) return { error: `Муфта №${d.number} уже есть на этом объекте` };

  const closure = await prisma.closure.create({
    data: {
      projectId: d.projectId,
      number: d.number,
      kind,
      model: nullify(d.model),
      city: nullify(d.city),
      street: nullify(d.street),
      house: nullify(d.house),
      lat: coords.lat,
      lng: coords.lng,
      notes: nullify(d.notes),
      cassettes: { create: [{ number: 1, capacity: 12 }] },
    },
  });
  revalidatePath(`/projects/${d.projectId}`);
  redirect(`/closures/${closure.id}`);
}

export async function updateClosure(id: string, formData: FormData) {
  const auth = await resolveEditor(String(formData.get("shareToken") ?? "") || null, id);
  if ("error" in auth) return { error: auth.error };

  const parsed = closureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const d = parsed.data;
  const coords = parseCoordPair(d.lat, d.lng);
  if ("error" in coords) return { error: coords.error };

  const before = await prisma.closure.findUnique({
    where: { id },
    select: {
      number: true,
      kind: true,
      model: true,
      city: true,
      street: true,
      house: true,
      lat: true,
      lng: true,
      notes: true,
    },
  });
  if (!before) return { error: "Муфта не найдена" };

  const after = {
    number: d.number,
    kind: d.kind,
    model: nullify(d.model),
    city: nullify(d.city),
    street: nullify(d.street),
    house: nullify(d.house),
    lat: coords.lat,
    lng: coords.lng,
    notes: nullify(d.notes),
  };

  const changed = changedFields(before, after);
  // Сохранение без единой правки не должно засорять историю пустой строкой.
  if (changed.length === 0) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.closure.update({ where: { id }, data: after });
    await logHistory(tx, auth.actor, id, {
      action: "closureUpdate",
      summary: changed.map((key) => FIELD_LABELS[key]).join(", "),
      before,
      after,
    });
  });
  revalidatePath(`/closures/${id}`);
  return { ok: true };
}

export async function setClosureStatus(
  id: string,
  status: "DRAFT" | "IN_PROGRESS" | "DONE",
  shareToken?: string | null,
) {
  // Статус меняют и с публичной страницы: там токен приходит отдельным аргументом.
  const auth = await resolveEditor(shareToken, id);
  if ("error" in auth) return { error: auth.error };
  const before = await prisma.closure.findUnique({ where: { id }, select: { status: true } });
  if (!before) return { error: "Муфта не найдена" };
  if (before.status === status) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.closure.update({ where: { id }, data: { status } });
    await logHistory(tx, auth.actor, id, {
      action: "closureStatus",
      summary: `${STATUS_LABELS[before.status]} → ${STATUS_LABELS[status]}`,
      before,
      after: { status },
    });
  });
  revalidatePath(`/closures/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteClosure(id: string) {
  // Удаление муфты — только владелец: у гостя такого права нет даже по edit-ссылке.
  if (!(await hasValidSession())) return { error: "Удалять муфты может только владелец" };
  const closure = await prisma.closure.findUnique({ where: { id }, select: { projectId: true } });
  await prisma.closure.delete({ where: { id } });
  if (closure) revalidatePath(`/projects/${closure.projectId}`);
  redirect(closure ? `/projects/${closure.projectId}` : "/");
}

const FIELD_LABELS: Record<string, string> = {
  number: "номер",
  kind: "тип",
  model: "модель",
  city: "город",
  street: "улица",
  house: "дом",
  lat: "широта",
  lng: "долгота",
  notes: "заметки",
};

/** Какие поля муфты реально изменились: пустые правки в историю не пишем. */
function changedFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  return Object.keys(FIELD_LABELS).filter(
    (key) => String(before[key] ?? "") !== String(after[key] ?? ""),
  );
}
