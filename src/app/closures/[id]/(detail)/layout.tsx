import Link from "next/link";
import { notFound } from "next/navigation";
import { loadClosure, fiberStats } from "@/lib/closure-data";
import { AppShell } from "@/components/app-shell";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/labels";
import { ClosureTabs } from "./closure-tabs";
import { StatusControl } from "./status-control";
import { EditClosureButton } from "@/components/edit-dialogs";
import { LocationMap } from "@/components/location-map";
import { formatPostalAddress } from "@/lib/address";

export const dynamic = "force-dynamic";

export default async function ClosureLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();
  const stats = fiberStats(closure);

  return (
    <AppShell
      breadcrumbs={[
        { label: "Объекты", href: "/" },
        { label: closure.project.name, href: `/projects/${closure.projectId}` },
        { label: `Муфта №${closure.number}` },
      ]}
      actions={
        <Link href={`/closures/${id}/print`} className="btn btn-ghost px-2.5 py-1.5 text-[13px]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="6" y="14" width="12" height="7" rx="1" />
          </svg>
          Документ
        </Link>
      }
    >
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="min-w-0 text-[22px] leading-tight sm:text-[24px]">
            Муфта №{closure.number}
          </h1>
          <span className="chip uppercase">{closure.kind}</span>
          <span className={`chip ${STATUS_STYLES[closure.status]}`}>{STATUS_LABELS[closure.status]}</span>
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <EditClosureButton closure={closure} />
            <StatusControl closureId={closure.id} status={closure.status} />
          </div>
        </div>
        <p className="mt-1 break-words text-[13px] text-[var(--color-ink-500)]">
          {[closure.model, closure.address].filter(Boolean).join(" · ") || "Модель и адрес не указаны"}
        </p>
      </div>

      {(closure.lat != null || closure.city) && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-0.5 text-[12.5px]">
            <span className="text-[10.5px] uppercase tracking-wide text-[var(--color-ink-400)]">
              Адрес
            </span>
            <span className="min-w-0 break-words font-medium">
              {formatPostalAddress(closure) ?? "не указан"}
            </span>
            {closure.address && (
              <span className="min-w-0 break-words text-[var(--color-ink-500)]">
                · ориентир: {closure.address}
              </span>
            )}
            {closure.lat == null && (
              <span className="text-[11.5px] text-[var(--color-ink-400)]">
                · координаты не заданы, карта появится после заполнения
              </span>
            )}
          </div>
          {closure.lat != null && closure.lng != null && (
            <LocationMap
              lat={closure.lat}
              lng={closure.lng}
              label={`Муфта №${closure.number}`}
              address={formatPostalAddress(closure)}
            />
          )}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-5">
        <StatTile label="Волокон" value={stats.total} />
        <StatTile label="Сварено" value={stats.spliced} tone="accent" />
        <StatTile label="Свободно" value={stats.free} />
        <StatTile label="Транзит" value={stats.transit} />
        <StatTile label="Повреждено" value={stats.damaged} tone={stats.damaged > 0 ? "danger" : undefined} />
      </div>

      <ClosureTabs closureId={closure.id} />
      <div className="mt-4">{children}</div>
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "accent" | "danger";
}) {
  const color =
    tone === "accent"
      ? "text-[var(--color-accent)]"
      : tone === "danger"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-ink-900)]";
  return (
    <div className="card px-3 py-2">
      <div className={`text-[19px] font-semibold leading-tight tabular-nums ${color}`}>{value}</div>
      <div className="text-[11.5px] text-[var(--color-ink-400)]">{label}</div>
    </div>
  );
}
