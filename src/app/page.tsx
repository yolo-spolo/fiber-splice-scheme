import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppShell, EmptyState, PageTitle } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { NewProjectDialog } from "./new-project-dialog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireSession("/");
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      closures: {
        orderBy: { number: "asc" },
        include: {
          cables: { orderBy: { order: "asc" }, select: { fiberCount: true, label: true, id: true } },
          splices: { select: { id: true } },
          _count: { select: { photos: true } },
        },
      },
    },
  });

  const totalClosures = projects.reduce((n, p) => n + p.closures.length, 0);
  const totalSplices = projects.reduce(
    (n, p) => n + p.closures.reduce((m, c) => m + c.splices.length, 0),
    0,
  );

  return (
    <AppShell
      actions={
        <Link href="/settings" className="btn btn-ghost px-2.5 py-1.5 text-[13px]">
          Справочники
        </Link>
      }
    >
      <PageTitle
        title="Объекты"
        subtitle={
          projects.length > 0
            ? `${projects.length} объектов · ${totalClosures} муфт · ${totalSplices} сварок`
            : "Начните с объекта — к нему привязываются муфты и кабели"
        }
        right={<NewProjectDialog />}
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Пока пусто"
          hint="Создайте объект (адрес, заказчик), затем добавьте муфты и кабели. Схема сварок собирается внутри муфты."
          action={<NewProjectDialog trigger="Создать первый объект" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const fiberTotal = project.closures.reduce(
              (n, c) => n + c.cables.reduce((m, cable) => m + cable.fiberCount, 0),
              0,
            );
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card group flex min-w-0 flex-col gap-3 p-4 transition hover:border-[var(--color-accent)] hover:shadow-[0_2px_14px_rgb(16_24_40_/_0.07)]"
              >
                <div>
                  <div className="text-[15.5px] font-semibold leading-snug group-hover:text-[var(--color-accent)]">
                    {project.name}
                  </div>
                  <div className="mt-0.5 truncate text-[12.5px] text-[var(--color-ink-500)]">
                    {[project.customer, project.address].filter(Boolean).join(" · ") || "Без реквизитов"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="chip">{project.closures.length} муфт</span>
                  <span className="chip">{fiberTotal} волокон</span>
                  {project.closures.some((c) => c._count.photos > 0) && (
                    <span className="chip">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      фото
                    </span>
                  )}
                </div>

                {project.closures.length > 0 && (
                  <div className="mt-auto space-y-1.5 border-t border-[var(--color-line)] pt-3">
                    {project.closures.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="truncate text-[var(--color-ink-700)]">
                          №{c.number} · {c.kind.toLowerCase()}
                        </span>
                        <span className="shrink-0 text-[var(--color-ink-400)]">
                          {c.splices.length} свар.
                        </span>
                      </div>
                    ))}
                    {project.closures.length > 3 && (
                      <div className="text-[12px] text-[var(--color-ink-400)]">
                        и ещё {project.closures.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
