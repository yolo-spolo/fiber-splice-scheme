"use client";

import { useTransition } from "react";
import { colorByCode, FIBER_COLORS, FIBER_COLORS_STRIPED } from "@/lib/colors";
import { setFiberColor } from "@/lib/actions/splices";

/**
 * Быстрая смена цвета жилы: 12 базовых цветов и 12 «с полосой».
 * Открывается тапом по волокну — прямо в редакторе сварок.
 */
export function FiberColorPicker({
  fiberId,
  currentCode,
  title,
  onDone,
}: {
  fiberId: string;
  currentCode: number;
  title?: string;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();

  function apply(code: number) {
    start(async () => {
      await setFiberColor(fiberId, code);
      onDone?.();
    });
  }

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold">{title ?? "Цвет жилы"}</span>
        {pending && <span className="text-[11px] text-[var(--color-ink-400)]">Сохраняю…</span>}
      </div>

      {[
        { label: "Основные", colors: FIBER_COLORS },
        { label: "С полосой", colors: FIBER_COLORS_STRIPED },
      ].map((group) => (
        <div key={group.label} className="mb-1.5 last:mb-0">
          <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[var(--color-ink-400)]">
            {group.label}
          </div>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
            {group.colors.map((color) => {
              const active = color.code === currentCode;
              return (
                <button
                  key={color.code}
                  type="button"
                  disabled={pending}
                  onClick={() => apply(color.code)}
                  title={color.name}
                  aria-label={color.name}
                  aria-pressed={active}
                  className={`relative h-7 rounded-md border transition ${
                    active
                      ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/40"
          : "border-[var(--color-swatch-line)] hover:scale-105"
                  }`}
                  style={{
                    background: color.hex,
                    backgroundImage: color.striped
                      ? "repeating-linear-gradient(45deg, rgba(0,0,0,.5) 0 2px, transparent 2px 6px)"
                      : undefined,
                  }}
                >
                  {active && (
                    <span className="absolute inset-0 grid place-items-center text-[11px] font-bold text-white drop-shadow">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--color-ink-500)]">
        <span className="swatch !h-3 !w-3" style={{ background: colorByCode(currentCode).hex }} />
        Сейчас: {colorByCode(currentCode).name.toLowerCase()}
      </div>
    </div>
  );
}
