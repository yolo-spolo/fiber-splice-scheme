import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { summarize, validateClosure } from "@/lib/validate";

export const dynamic = "force-dynamic";

export default async function CheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  const issues = validateClosure({
    fibers: closure.cables.flatMap((cable) =>
      cable.fibers.map((f) => ({
        id: f.id,
        cableId: cable.id,
        cableLabel: cable.label,
        moduleIndex: f.moduleIndex,
        position: f.position,
        colorCode: f.colorCode,
        status: f.status,
      })),
    ),
    splices: closure.splices.map((s) => ({
      id: s.id,
      fiberAId: s.fiberAId,
      fiberBId: s.fiberBId,
      cassetteId: s.cassetteId,
      kind: s.kind,
      lossDb: s.lossDb,
    })),
    cassettes: closure.cassettes.map((c) => ({ id: c.id, number: c.number, capacity: c.capacity })),
  });

  const { errors, warnings } = summarize(issues);

  const splicedFiberIds = new Set(closure.splices.flatMap((s) => [s.fiberAId, s.fiberBId]));
  const unsplicedCables = closure.cables.filter(
    (cable) => !cable.fibers.some((f) => splicedFiberIds.has(f.id)),
  );

  return (
    <div className="space-y-4">
      <div
        className={`card flex items-center gap-3 p-4 ${
          errors > 0
            ? "!border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)]/25"
            : warnings > 0
              ? "!border-[var(--color-warn-soft)] bg-[var(--color-warn-soft)]/25"
              : "!border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/25"
        }`}
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-on-accent)] ${
            errors > 0 ? "bg-[var(--color-danger)]" : warnings > 0 ? "bg-[var(--color-warn)]" : "bg-[var(--color-accent)]"
          }`}
        >
          {errors > 0 || warnings > 0 ? "!" : "✓"}
        </span>
        <div>
          <div className="text-[14.5px] font-semibold">
            {errors > 0
              ? `${errors} ошибок — сдавать нельзя`
              : warnings > 0
                ? `${warnings} замечаний, критичных ошибок нет`
                : "Схема в порядке"}
          </div>
          <div className="text-[12.5px] text-[var(--color-ink-500)]">
            Проверяются двойные сварки, ёмкость кассет, затухание и статусы волокон
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <ul className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2.5 px-4 py-2.5">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase ${
                  issue.level === "error"
                    ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]"
                    : "bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
                }`}
              >
                {issue.level === "error" ? "ошибка" : "внимание"}
              </span>
              <span className="text-[13px]">{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      {unsplicedCables.length > 0 && (
        <div className="card px-4 py-3">
          <div className="text-[13px] font-semibold">Кабели без сварок</div>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
            {unsplicedCables.map((c) => c.label).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
