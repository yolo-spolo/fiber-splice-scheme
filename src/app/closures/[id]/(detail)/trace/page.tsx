import Link from "next/link";
import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { closureTitle } from "@/lib/address";
import { loadTraceData } from "@/lib/trace-data";
import { fiberAddress, stepExit, traceFiber, type TraceStop } from "@/lib/fiber-trace";
import { FIBER_STATUS_LABELS } from "@/lib/labels";
import { TracePicker } from "./trace-picker";

export const dynamic = "force-dynamic";

/**
 * Трасса волокна через муфты объекта.
 *
 * Раньше, чтобы проследить абонента, монтажник открывал муфты по очереди и
 * искал сварку глазами. Теперь маршрут строится одним проходом: каждая
 * строка — муфта, волокно и то, с чем оно сварено.
 */
export default async function TracePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fiber?: string }>;
}) {
  const { id } = await params;
  const { fiber: fiberId } = await searchParams;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  const data = await loadTraceData(closure.projectId);
  const trace = fiberId ? traceFiber(data, fiberId) : null;

  // Список — все волокна объекта, сгруппированные по кабелю. Только
  // подписанных мало: подпись есть не у каждой жилы, а проследить маршрут
  // нужно и обычной. Кабель при этом остаётся подписью группы, и монтажник
  // ищет привычно: кабель, модуль, позиция.
  const groups = data.closures
    .flatMap((closure) =>
      data.cables
        .filter((cable) => cable.closureId === closure.id)
        .map((cable) => ({
          closure,
          cable,
          fibers: data.fibers.filter((fiber) => fiber.cableId === cable.id),
        })),
    )
    .filter((group) => group.fibers.length > 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px]">Трасса волокна</h2>
        <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
          Маршрут через муфты объекта: где сварка, с чем соединено и где кончается.
        </p>
      </div>

      <TracePicker closureId={closure.id} groups={groups} value={fiberId ?? ""} />

      {!fiberId && (
        <p className="card px-4 py-8 text-center text-[13px] text-[var(--color-ink-500)]">
          {groups.length > 0
            ? "Выберите волокно — покажем весь маршрут до обоих концов."
            : "В объекте пока нет кабелей с волокнами."}
        </p>
      )}

      {fiberId && !trace && (
        <p className="card px-4 py-8 text-center text-[13px] text-[var(--color-ink-500)]">
          Такого волокна нет — возможно, кабель пересоздали. Выберите другое.
        </p>
      )}

      {trace && (
        <>
          <StopNote stop={trace.startStop} side="начало" />
          <ol className="card divide-y divide-[var(--color-line)] overflow-hidden">
            {trace.steps.map((step, index) => {
              const exit = stepExit(step);
              return (
                <li key={`${step.closure.id}:${step.fiber.id}`} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="w-6 shrink-0 text-[11px] tabular-nums text-[var(--color-ink-400)]">
                      {index + 1}
                    </span>
                    <Link
                      href={`/closures/${step.closure.id}`}
                      className="text-[13px] font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {closureTitle(step.closure)}
                    </Link>
                    <span className="chip shrink-0 tabular-nums">№{step.closure.number}</span>
                    {step.closure.id === closure.id && (
                      <span className="chip shrink-0">открыта</span>
                    )}
                  </div>
                  <div className="mt-1 pl-6 text-[12.5px] text-[var(--color-ink-700)]">
                    <span className="font-medium">{step.cable.label}</span> ·{" "}
                    {fiberAddress(step.fiber)} · {FIBER_STATUS_LABELS[step.fiber.status] ?? step.fiber.status}
                    {step.fiber.label && <span> · {step.fiber.label}</span>}
                  </div>
                  {step.splice && (
                    <div className="mt-1 pl-6 text-[12.5px] text-[var(--color-ink-500)]">
                      сварено с <span className="font-medium">{step.splice.withCable.label}</span>{" "}
                      {fiberAddress(step.splice.with)}
                      {step.splice.lossDb != null && (
                        <span className="tabular-nums"> · {step.splice.lossDb} дБ</span>
                      )}
                    </div>
                  )}
                  {step.link === "cable" && (
                    <div className="mt-1 pl-6 text-[11.5px] text-[var(--color-ink-400)]">
                      кабель уходит {exit ? `в ${exit}` : "на другой конец"}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <StopNote stop={trace.endStop} side="конец" />
        </>
      )}
    </div>
  );
}

/** Причина остановки маршрута: обрыв, кольцо или противоречивые данные. */
function StopNote({ stop, side }: { stop: TraceStop; side: string }) {
  const tone =
    stop.kind === "end"
      ? "border-[var(--color-line)] text-[var(--color-ink-500)]"
      : "border-[var(--color-warn)] text-[var(--color-warn)]";
  return (
    <p className={`rounded-lg border px-3 py-2 text-[12px] ${tone}`}>
      <span className="uppercase tracking-wide opacity-70">{side}: </span>
      {stop.reason}
    </p>
  );
}
