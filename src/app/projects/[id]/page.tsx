import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell, EmptyState, PageTitle } from "@/components/app-shell";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import { NewClosureDialog } from "./new-closure-dialog";
import { EditProjectButton } from "@/components/edit-dialogs";
import { requireSession } from "@/lib/session";
import { closureTitle, formatPostalAddress } from "@/lib/address";
import { ClosureMapButton } from "@/components/closure-map-dialog";
import { plural } from "@/lib/cable-layout";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/projects/${id}`);
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
            {project.closures.length > 0 && (
              <Link href={`/projects/${project.id}/print`} className="btn btn-ghost">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="6" y="14" width="12" height="7" rx="1" />
                </svg>
                Документ объекта
              </Link>
            )}
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
            const address = formatPostalAddress(c);
            return (
              <div
                key={c.id}
                className="card group flex min-w-0 flex-col p-4 transition hover:border-[var(--color-accent)] hover:shadow-[0_2px_14px_rgb(16_24_40_/_0.07)]"
              >
                <Link href={`/closures/${c.id}`} className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="min-w-0 break-words text-[15.5px] font-semibold leading-snug group-hover:text-[var(--color-accent)]">
                        {closureTitle(c)}
                      </div>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[12.5px] text-[var(--color-ink-500)]">
                        {/* Без адреса номер уже в заголовке — второй раз не повторяем. */}
                        {address && (
                          <span className="whitespace-nowrap">
                            {c.kind.toLowerCase()} <span className="tabular-nums">№{c.number}</span>
                          </span>
                        )}
                        {c.model && (
                          <span className="min-w-0 truncate">
                            {address ? `· ${c.model}` : c.model}
                          </span>
                        )}
                        {!address && !c.model && <span>адрес не указан</span>}
                      </div>
                    </div>
                    <span className={`chip shrink-0 ${STATUS_STYLES[c.status]}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-[var(--color-line)] pt-3 text-center">
                    <Stat value={c.cables.length} label="кабелей" />
                    <Stat value={fibers} label="волокон" />
                    <Stat value={c.splices.length} label="сварок" />
                  </div>
                </Link>

                <div className="mt-2.5 flex items-center gap-2 text-[12px] text-[var(--color-ink-400)]">
                  <span>
                    {c._count.cassettes} {plural(c._count.cassettes, "кассета", "кассеты", "кассет")}
                  </span>
                  {c._count.photos > 0 && <span>· {c._count.photos} фото</span>}
                  <ClosureMapButton
                    lat={c.lat}
                    lng={c.lng}
                    title={closureTitle(c)}
                    address={address}
                    className="ml-auto"
                  />
                </div>
              </div>
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
