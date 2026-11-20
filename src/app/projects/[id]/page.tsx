import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell, EmptyState, PageTitle } from "@/components/app-shell";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import { NewClosureDialog } from "./new-closure-dialog";
import { EditProjectButton } from "@/components/edit-dialogs";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      closures: {
        orderBy: { number: "asc" },
        include: {
          cables: { select: { fiberCount: true } },
          splices: { select: { id: true } },
          _count: { select: { photos: true, cassettes: true } },
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <AppShell
      breadcrumbs={[{ label: "Объекты", href: "/" }, { label: project.name }]}
    >
      <PageTitle
        title={project.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {project.customer && <span>{project.customer}</span>}
            {project.contract && <span>· договор {project.contract}</span>}
            {project.address && <span>· {project.address}</span>}
          </span>
        }
        right={
          <>
            <EditProjectButton project={project} />
            <NewClosureDialog projectId={project.id} />
          </>
        }
      />

      {project.closures.length === 0 ? (
        <EmptyState
          title="Муфт пока нет"
          hint="Добавьте первую муфту — в ней будут кабели, кассеты и схема сварок."
          action={<NewClosureDialog projectId={project.id} trigger="Добавить муфту" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {project.closures.map((c) => {
            const fibers = c.cables.reduce((n, cable) => n + cable.fiberCount, 0);
            return (
              <Link key={c.id} href={`/closures/${c.id}`} className="card group min-w-0 p-4 transition hover:border-[var(--color-accent)] hover:shadow-[0_2px_14px_rgb(16_24_40_/_0.07)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[17px] font-semibold tabular-nums">№{c.number}</span>
                      <span className="text-[12.5px] uppercase tracking-wide text-[var(--color-ink-400)]">{c.kind}</span>
                    </div>
                    <div className="truncate text-[12.5px] text-[var(--color-ink-500)]">
                      {c.model || c.address || "Модель не указана"}
                    </div>
                  </div>
                  <span className={`chip shrink-0 ${STATUS_STYLES[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-[var(--color-line)] pt-3 text-center">
                  <Stat value={c.cables.length} label="кабелей" />
                  <Stat value={fibers} label="волокон" />
                  <Stat value={c.splices.length} label="сварок" />
                </div>

                <div className="mt-2.5 flex items-center gap-2 text-[12px] text-[var(--color-ink-400)]">
                  <span>{c._count.cassettes} кассет</span>
                  {c._count.photos > 0 && <span>· {c._count.photos} фото</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-[16px] font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-[var(--color-ink-400)]">{label}</div>
    </div>
  );
}
