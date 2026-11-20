"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CLOSURE_KINDS } from "@/lib/cable-types";

const closureSchema = z.object({
  projectId: z.string().min(1),
  number: z.string().trim().min(1, "Укажите номер муфты").max(60),
  kind: z.string().trim().min(1),
  model: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
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

function coord(value?: number | ""): number | null {
  return value === "" || value == null ? null : Number(value);
}

export async function createClosure(formData: FormData) {
  const parsed = closureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const d = parsed.data;
  const kind = (CLOSURE_KINDS as readonly string[]).includes(d.kind) ? d.kind : "МУФТА";

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
      address: nullify(d.address),
      city: nullify(d.city),
      street: nullify(d.street),
      house: nullify(d.house),
      lat: coord(d.lat),
      lng: coord(d.lng),
      notes: nullify(d.notes),
      cassettes: { create: [{ number: 1, capacity: 12 }] },
    },
  });
  revalidatePath(`/projects/${d.projectId}`);
  redirect(`/closures/${closure.id}`);
}

export async function updateClosure(id: string, formData: FormData) {
  const parsed = closureSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  const d = parsed.data;
  await prisma.closure.update({
    where: { id },
    data: {
      number: d.number,
      kind: d.kind,
      model: nullify(d.model),
      address: nullify(d.address),
      city: nullify(d.city),
      street: nullify(d.street),
      house: nullify(d.house),
      lat: coord(d.lat),
      lng: coord(d.lng),
      notes: nullify(d.notes),
    },
  });
  revalidatePath(`/closures/${id}`);
  return { ok: true };
}

export async function setClosureStatus(id: string, status: "DRAFT" | "IN_PROGRESS" | "DONE") {
  await prisma.closure.update({ where: { id }, data: { status } });
  revalidatePath(`/closures/${id}`);
  revalidatePath("/");
}

export async function deleteClosure(id: string) {
  const closure = await prisma.closure.findUnique({ where: { id }, select: { projectId: true } });
  await prisma.closure.delete({ where: { id } });
  if (closure) revalidatePath(`/projects/${closure.projectId}`);
  redirect(closure ? `/projects/${closure.projectId}` : "/");
}
