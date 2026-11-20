"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Укажите название объекта").max(200),
  customer: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  contract: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function emptyToNull(v?: string) {
  const t = v?.trim();
  return t ? t : null;
}

export async function createProject(formData: FormData) {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  }
  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      customer: emptyToNull(parsed.data.customer),
      address: emptyToNull(parsed.data.address),
      contract: emptyToNull(parsed.data.contract),
      notes: emptyToNull(parsed.data.notes),
    },
  });
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(id: string, formData: FormData) {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  await prisma.project.update({
    where: { id },
    data: {
      name: parsed.data.name,
      customer: emptyToNull(parsed.data.customer),
      address: emptyToNull(parsed.data.address),
      contract: emptyToNull(parsed.data.contract),
      notes: emptyToNull(parsed.data.notes),
    },
  });
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}
