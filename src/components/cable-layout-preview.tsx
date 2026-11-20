"use client";

import { colorByCode } from "@/lib/colors";
import { cableLayout, plural } from "@/lib/cable-layout";

/**
 * Наглядный предпросмотр: сколько получится модулей, что заполнено,
 * где останутся пустые места. Видно ещё до сохранения.
 */
export function CableLayoutPreview({
  fiberCount,
  moduleCount,
  moduleCapacity,
  compact = false,
}: {
  fiberCount: number;
  moduleCount: number;
  moduleCapacity: number;
  compact?: boolean;
}) {
  const layout = cableLayout(fiberCount, moduleCount, moduleCapacity);
  const shown = Math.max(1, Math.min(layout.moduleCount, compact ? 3 : 8));

  const rows = Array.from({ length: shown }, (_, index) => {
    const remaining = layout.fiberCount - index * layout.moduleCapacity;
    const inModule = Math.max(0, Math.min(layout.moduleCapacity, remaining));
    return { number: index + 1, inModule };
  });

  return (
    <div
      className={`rounded-xl border p-2.5 ${
        layout.fits
          ? "border-[var(--color-line)] bg-[var(--color-canvas)]"
          : "border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)]/25"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-semibold">
          {layout.fiberCount} {plural(layout.fiberCount, "волокно", "волокна", "волокон")}
        </span>
        <span className="text-[12px] text-[var(--color-ink-500)]">{layout.summary}</span>
      </div>

      {layout.moduleCount > 0 && (
        <div className="mt-2 space-y-1">
          {rows.map((row) => (
            <div key={row.number} className="flex items-center gap-2">
              <span className="w-[52px] shrink-0 text-[10.5px] text-[var(--color-ink-400)]">
                М{row.number}
              </span>
              <span className="flex flex-wrap gap-[2px]">
                {Array.from({ length: layout.moduleCapacity }, (_, i) => {
                  const filled = i < row.inModule;
                  const color = colorByCode(i);
                  return (
                    <span
                      key={i}
                      className={`h-3 w-3 rounded-[2px] border ${
                        filled ? "border-black/25" : "border-dashed border-[var(--color-line)] bg-white"
                      }`}
                      style={filled ? { background: color.hex } : undefined}
                      title={filled ? `${i + 1} · ${color.name}` : "свободно"}
                    />
                  );
                })}
              </span>
              <span className="text-[10.5px] tabular-nums text-[var(--color-ink-400)]">
                {row.inModule}/{layout.moduleCapacity}
              </span>
            </div>
          ))}
          {layout.moduleCount > shown && (
            <div className="pl-[60px] text-[10.5px] text-[var(--color-ink-400)]">
              и ещё {layout.moduleCount - shown}{" "}
              {plural(layout.moduleCount - shown, "модуль", "модуля", "модулей")}
            </div>
          )}
        </div>
      )}

      {!layout.fits && (
        <p className="mt-1.5 text-[11px] font-medium text-[var(--color-danger)]">
          Не помещается: {layout.overflow} {plural(layout.overflow, "волокно", "волокна", "волокон")}{" "}
          сверх {layout.capacity}. Добавьте модуль или уменьшите количество волокон.
        </p>
      )}

      {layout.fits && layout.emptyModules > 0 && (
        <p className="mt-1.5 text-[11px] text-[var(--color-warn)]">
          {layout.emptyModules} {plural(layout.emptyModules, "модуль", "модуля", "модулей")} останется
          пустым — {layout.emptyModules * layout.moduleCapacity}{" "}
          {plural(layout.emptyModules * layout.moduleCapacity, "место", "места", "мест")}.
        </p>
      )}

      {layout.fits && layout.emptyModules === 0 && layout.freeSlots > 0 && (
        <p className="mt-1.5 text-[11px] text-[var(--color-warn)]">
          Последний модуль заполнен на {layout.remainder || layout.moduleCapacity} из{" "}
          {layout.moduleCapacity} — свободно {layout.freeSlots}{" "}
          {plural(layout.freeSlots, "место", "места", "мест")}.
        </p>
      )}

      {layout.fits && layout.freeSlots === 0 && layout.fiberCount > 0 && (
        <p className="mt-1.5 text-[11px] text-[var(--color-accent)]">
          Все модули заполнены полностью — {layout.moduleCount}{" "}
          {plural(layout.moduleCount, "модуль", "модуля", "модулей")} по {layout.moduleCapacity}.
        </p>
      )}
    </div>
  );
}
