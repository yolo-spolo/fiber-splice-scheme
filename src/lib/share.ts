import { prisma } from "@/lib/prisma";

export async function resolveShareToken(token: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      project: true,
      closure: { include: { project: true } },
    },
  });
  if (!link) return { status: "notfound" as const };
  if (link.revokedAt) return { status: "revoked" as const };
  if (link.expiresAt && link.expiresAt < new Date()) return { status: "expired" as const };
  return { status: "ok" as const, link };
}
