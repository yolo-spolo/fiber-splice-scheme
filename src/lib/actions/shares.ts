"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function createShareLink(input: {
  projectId?: string;
  closureId?: string;
  mode?: "READ" | "EDIT";
  days?: number | null;
}) {
  // Ссылку создаёт только владелец: гостевая сессия живёт на токене и сюда
  // попасть не должна.
  await requireSession("/");
  if (Boolean(input.projectId) === Boolean(input.closureId)) {
    return { error: "Ссылка создаётся либо на муфту, либо на объект" };
  }
  if (input.closureId) {
    const exists = await prisma.closure.findUnique({
      where: { id: input.closureId },
      select: { projectId: true },
    });
    if (!exists) return { error: "Муфта не найдена" };
  }
  if (input.projectId) {
    const exists = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true },
    });
    if (!exists) return { error: "Объект не найден" };
  }

  const token = randomBytes(24).toString("base64url");
  const link = await prisma.shareLink.create({
    data: {
      token,
      projectId: input.projectId ?? null,
      closureId: input.closureId ?? null,
      mode: input.mode === "EDIT" ? "EDIT" : "READ",
      expiresAt: input.days ? new Date(Date.now() + input.days * 86_400_000) : null,
    },
  });
  const projectId = input.projectId ?? (input.closureId
    ? (await prisma.closure.findUnique({
        where: { id: input.closureId },
        select: { projectId: true },
      }))?.projectId ?? null
    : null);
  revalidateSharePaths({ projectId, closureId: input.closureId ?? null });
  return { ok: true, token: link.token };
}

export async function revokeShareLink(id: string) {
  await requireSession("/");
  const link = await prisma.shareLink.update({
    where: { id },
    data: { revokedAt: new Date() },
    include: { closure: { select: { projectId: true } } },
  });
  revalidateSharePaths({
    projectId: link.projectId ?? link.closure?.projectId ?? null,
    closureId: link.closureId,
  });
  return { ok: true };
}

export async function deleteShareLink(id: string) {
  await requireSession("/");
  const link = await prisma.shareLink.delete({
    where: { id },
    include: { closure: { select: { projectId: true } } },
  });
  revalidateSharePaths({
    projectId: link.projectId ?? link.closure?.projectId ?? null,
    closureId: link.closureId,
  });
  return { ok: true };
}

/** Панель ссылок живёт и на муфте, и на объекте — обновляем обе страницы. */
function revalidateSharePaths(link: { projectId: string | null; closureId: string | null }) {
  if (link.closureId) revalidatePath(`/closures/${link.closureId}/share`);
  if (link.projectId) revalidatePath(`/projects/${link.projectId}/share`);
}
