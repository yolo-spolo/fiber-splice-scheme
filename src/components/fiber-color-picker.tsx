"use client";

import { useState, useTransition } from "react";
import { colorByCode, FIBER_COLORS, FIBER_COLORS_STRIPED } from "@/lib/colors";
import { setFiberColor, setFiberLabel } from "@/lib/actions/splices";
import { useShareToken } from "@/components/edit-scope";

/**
 * Быстрая смена цвета жилы: 12 базовых цветов и 12 «с полосой».
 * Открывается тапом по волокну — прямо в редакторе сварок.
 */
export function FiberColorPicker({
  fiberId,
  currentCode,
  currentLabel,
  title,
  onDone,
}: {
  fiberId: string;
  currentCode: number;
  currentLabel?: string | null;
  title?: string;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const shareToken = useShareToken();
  const [label, setLabel] = useState(currentLabel ?? "");
  const [labelError, setLabelError] = useState<string | null>(null);

  function apply(code: number) {
    start(async () => {
      const res = await setFiberColor(fiberId, code, shareToken);
      if (res?.error) alert(res.error);
      onDone?.();
    });
  }

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold">{title ?? "Цвет жилы"}</span>
        {pending && <span className="text-[11px] text-[var(--color-ink-400)]">Сохраняю…</span>}
      </div>

      {/* Подпись — «для какого абонента или объекта». Печатается в документе
          рядом с номером волокна. */}
      <div className="mb-2 rounded-lg bg-[var(--color-canvas)] p-2">
        <label className="block">
          <span className="label">Подпись волокна</span>
          <input
            className="field !py-1.5 text-[12.5px]"
            value={label}
            maxLength={120}
            placeholder="Абонент: кв. 42, Петров"
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              setLabelError(null);
              start(async () => {
                const res = await setFiberLabel(fiberId, label, shareToken);
                if (res?.error) setLabelError(res.error);
              });
            }}
          />
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost px-2 py-0.5 text-[11.5px]"
            disabled={pending}
            onClick={() => {
              setLabelError(null);
              start(async () => {
                const res = await setFiberLabel(fiberId, label, shareToken);
                if (res?.error) setLabelError(res.error);
              });
            }}
          >
            Сохранить подпись
          </button>
          <span className="text-[11px] text-[var(--color-ink-400)]">
            {currentLabel ? "подпись есть" : "без подписи"}
          </span>
        </div>
        {labelError && <p className="mt-1 text-[11.5px] text-[var(--color-danger)]">{labelError}</p>}
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
