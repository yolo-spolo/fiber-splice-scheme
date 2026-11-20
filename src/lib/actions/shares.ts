"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createShareLink(input: {
  projectId?: string;
  closureId?: string;
  days?: number | null;
}) {
  const token = randomBytes(24).toString("base64url");
  const link = await prisma.shareLink.create({
    data: {
      token,
      projectId: input.projectId ?? null,
      closureId: input.closureId ?? null,
      expiresAt: input.days ? new Date(Date.now() + input.days * 86_400_000) : null,
    },
  });
  if (input.closureId) revalidatePath(`/closures/${input.closureId}`);
  if (input.projectId) revalidatePath(`/projects/${input.projectId}`);
  return { ok: true, token: link.token };
}

export async function revokeShareLink(id: string) {
  const link = await prisma.shareLink.update({ where: { id }, data: { revokedAt: new Date() } });
  if (link.closureId) revalidatePath(`/closures/${link.closureId}`);
  if (link.projectId) revalidatePath(`/projects/${link.projectId}`);
  return { ok: true };
}

export async function deleteShareLink(id: string) {
  await prisma.shareLink.delete({ where: { id } });
  return { ok: true };
}
