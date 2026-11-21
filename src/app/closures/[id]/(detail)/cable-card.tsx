"use client";

import { useState, useTransition } from "react";
import { deleteCable } from "@/lib/actions/cables";
import { setFiberStatus } from "@/lib/actions/splices";
import { colorByCode, moduleColorCode, swatchBackground } from "@/lib/colors";
import { cableLayout } from "@/lib/cable-layout";
import type { CableWithFibers } from "@/lib/closure-data";
import { FIBER_STATUS_LABELS } from "@/lib/labels";
import { EditCableDialog } from "./edit-cable-dialog";

export function CableCard({
  cable,
  splicedIds,
  closureId,
}: {
  cable: CableWithFibers;
  splicedIds: string[];
  closureId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();
  const [statusTarget, setStatusTarget] = useState<CableWithFibers["fibers"][number] | null>(null);
  const [editing, setEditing] = useState(false);
  const spliced = new Set(splicedIds);
  const doneCount = cable.fibers.filter((f) => spliced.has(f.id)).length;

  const modules = new Map<number, typeof cable.fibers>();
  for (const fiber of cable.fibers) {
    const list = modules.get(fiber.moduleIndex) ?? [];
    list.push(fiber);
    modules.set(fiber.moduleIndex, list);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="min-w-0 break-words text-[15px] font-semibold">{cable.label}</span>
            {cable.type && <span className="chip !py-0.5 text-[11.5px]">{cable.type}</span>}
            {cable.ownership === "FOREIGN" && (
              <span className="chip !border-[var(--color-warn-soft)] !bg-[var(--color-warn-soft)] !py-0.5 text-[11px] !text-[var(--color-warn)]">
                чужой
              </span>
            )}
            {cable.sheathColor && (
              <span className="text-[12px] text-[var(--color-ink-400)]">оболочка: {cable.sheathColor.toLowerCase()}</span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-1.5 text-[12.5px] text-[var(--color-ink-500)]">
            <span className="whitespace-nowrap">{cable.fiberCount} волокон</span>
            <span className="whitespace-nowrap">
              {cable.moduleCount} мод. ×{" "}
              {cableLayout(cable.fiberCount, cable.moduleCount).moduleCapacity}
            </span>
            {(cable.fromLocation || cable.toLocation) && (
              <span className="min-w-0 break-words">
                {cable.fromLocation ?? "?"} → {cable.toLocation ?? "?"}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <div className="mr-auto flex items-baseline gap-1 text-[12px] leading-tight text-[var(--color-ink-500)] sm:mr-0 sm:block sm:text-right">
            <div className="font-semibold text-[var(--color-ink-900)] tabular-nums">
              {doneCount}/{cable.fiberCount}
            </div>
            <div>сварено</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn btn-ghost px-2 py-1 text-[12.5px]"
              onClick={() => setEditing(true)}
              title="Изменить параметры кабеля"
            >
              Изменить
            </button>
            <button type="button" className="btn btn-ghost px-2 py-1 text-[12.5px]" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Свернуть" : "Волокна"}
            </button>
            <button
              type="button"
              className="btn btn-danger px-2 py-1 text-[12.5px]"
              disabled={pending}
              title="Удалить кабель из муфты"
              onClick={() => {
                if (
                  !confirm(
                    `Удалить кабель «${cable.label}» из муфты?\nВместе с ним удалятся его волокна и ${doneCount} сварок.`,
                  )
                )
                  return;
                start(async () => {
                  const res = await deleteCable(cable.id);
                  if (res?.error) alert(res.error);
                });
              }}
            >
              Удалить
            </button>
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-[#eef2f7]">
        <div
          className="h-full bg-[var(--color-accent)] transition-[width]"
          style={{ width: `${cable.fiberCount ? (doneCount / cable.fiberCount) * 100 : 0}%` }}
        />
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-[var(--color-line)] px-4 py-3">
          {[...modules.entries()].map(([moduleIndex, fibers]) => (
            <div key={moduleIndex}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-[2px] border border-black/30"
                  style={swatchBackground(
                    moduleColorCode(moduleIndex, cable.colorScheme, cable.moduleColors),
                  )}
                />
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                  Модуль {moduleIndex}
                </span>
                <span className="text-[10.5px] text-[var(--color-ink-400)]">
                  {colorByCode(
                    moduleColorCode(moduleIndex, cable.colorScheme, cable.moduleColors),
                  ).name.toLowerCase()}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fibers.map((fiber) => {
                  const color = colorByCode(fiber.colorCode);
                  const isSpliced = spliced.has(fiber.id);
                  const isDamaged = fiber.status === "DAMAGED";
                  return (
                    <button
                      key={fiber.id}
                      type="button"
                      onClick={() => setStatusTarget(fiber)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[12px] transition hover:border-[var(--color-accent)] ${
                        isDamaged
                          ? "border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)]/40"
                          : isSpliced
                            ? "border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)]/45"
                            : "border-[var(--color-line)] bg-white"
                      }`}
                      title={`${color.name} · ${FIBER_STATUS_LABELS[fiber.status]}`}
                    >
                      <span className="swatch" style={{ background: color.hex }} />
                      <span className="font-mono tabular-nums">{fiber.position}</span>
                      <span className="text-[11px] text-[var(--color-ink-400)]">{color.name.toLowerCase()}</span>
                      {isSpliced && (
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-[var(--color-accent)]" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {isDamaged && (
                        <svg viewBox="0 0 24 24" className="h-3 w-3 text-[var(--color-danger)]" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      )}

      {statusTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink-950)]/45 sm:items-center sm:p-4"
        >
          <div className="w-full max-w-[420px] rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px]">
                  {cable.label} · модуль {statusTarget.moduleIndex} · волокно {statusTarget.position}
                </h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-[var(--color-ink-500)]">
                  <span className="swatch" style={{ background: colorByCode(statusTarget.colorCode).hex }} />
                  {colorByCode(statusTarget.colorCode).name.toLowerCase()}
                  {spliced.has(statusTarget.id) && " · уже сварено"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost h-8 w-8 !p-0 text-[16px]"
                onClick={() => setStatusTarget(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="grid gap-1.5">
              {(["FREE", "TRANSIT", "DAMAGED"] as const).map((status) => {
                const disabled = status === "FREE" && spliced.has(statusTarget.id);
                const active = statusTarget.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={pending || disabled}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[13px] text-left transition ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold"
                        : "border-[var(--color-line)] hover:bg-[var(--color-canvas)]"
                    } ${disabled ? "opacity-40" : ""}`}
                    onClick={() =>
                      start(async () => {
                        await setFiberStatus(statusTarget.id, status);
                        setStatusTarget(null);
                      })
                    }
                  >
                    {FIBER_STATUS_LABELS[status]}
                    {active && <span className="text-[11px] text-[var(--color-accent)]">текущий</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-[11.5px] text-[var(--color-ink-400)]">
              Статус «сварено» ставится автоматически при создании сварки и снимается вместе с ней.
            </p>
          </div>
        </div>
      )}

      {editing && (
        <EditCableDialog
          cable={{
            id: cable.id,
            label: cable.label,
            type: cable.type,
            fiberCount: cable.fiberCount,
            moduleCount: cable.moduleCount,
            moduleCapacity: cable.moduleCapacity,
            colorScheme: cable.colorScheme,
            colorOrder: cable.colorOrder,
            moduleColors: cable.moduleColors,
            fromLocation: cable.fromLocation,
            toLocation: cable.toLocation,
            ownership: cable.ownership,
            sheathColor: cable.sheathColor,
            notes: cable.notes,
          }}
          splicedCount={doneCount}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
