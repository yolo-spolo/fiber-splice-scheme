import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadClosure } from "@/lib/closure-data";
import { SharePanel } from "@/components/share-panel";
import { shareBaseUrl } from "@/lib/base-url";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  const links = await prisma.shareLink.findMany({
    where: { closureId: closure.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SharePanel
      projectId={closure.projectId}
      closureId={closure.id}
      baseUrl={shareBaseUrl()}
      links={links.map((l) => ({
        id: l.id,
        token: l.token,
        scope: l.closureId ? "closure" : "project",
        targetLabel: l.closureId ? "эта муфта" : "весь объект",
        mode: l.mode,
        expiresAt: l.expiresAt?.toISOString() ?? null,
        revokedAt: l.revokedAt?.toISOString() ?? null,
        views: l.views,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
