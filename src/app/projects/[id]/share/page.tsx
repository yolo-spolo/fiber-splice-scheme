import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { SharePanel } from "@/components/share-panel";
import { AppShell } from "@/components/app-shell";
import { closureTitle } from "@/lib/address";
import { shareBaseUrl } from "@/lib/base-url";

export const dynamic = "force-dynamic";

/**
 * Ссылки объекта: на весь объект и на отдельные муфты. Здесь же видны ссылки,
 * выданные с карточек муфт, — иначе владелец искал бы их по одной.
 */
export default async function ProjectSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/projects/${id}/share`);

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      closures: {
        orderBy: { number: "asc" },
        select: { id: true, number: true, kind: true, city: true, street: true, house: true },
      },
    },
  });
  if (!project) notFound();

  const links = await prisma.shareLink.findMany({
    where: { OR: [{ projectId: project.id }, { closure: { projectId: project.id } }] },
    orderBy: { createdAt: "desc" },
  });

  const closureById = new Map(project.closures.map((closure) => [closure.id, closure]));
  return (
    <AppShell
      breadcrumbs={[
        { label: "Объекты", href: "/" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: "Ссылки" },
      ]}
    >
      <div className="mb-4">
        <h1 className="text-[20px] leading-tight">Ссылки объекта</h1>
        <p className="mt-0.5 text-[13px] text-[var(--color-ink-500)]">
          Ссылка на весь объект открывает список его муфт, ссылка на муфту — только одну схему.
        </p>
      </div>
      <div className="max-w-[860px]">
        <SharePanel
          baseUrl={shareBaseUrl()}
          projectId={project.id}
          closures={project.closures.map((closure) => ({
            id: closure.id,
            label: closureTitle(closure),
          }))}
          links={links.map((link) => ({
            id: link.id,
            token: link.token,
            scope: link.projectId ? "project" : "closure",
            targetLabel:
              link.projectId || !link.closureId
                ? "весь объект"
                : closureTitle(closureById.get(link.closureId) ?? { number: "?" }),
            mode: link.mode,
            expiresAt: link.expiresAt?.toISOString() ?? null,
            revokedAt: link.revokedAt?.toISOString() ?? null,
            views: link.views,
            createdAt: link.createdAt.toISOString(),
          }))}
        />
      </div>
    </AppShell>
  );
}
