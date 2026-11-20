"use client";

import { MODULE_CAPACITIES } from "@/lib/cable-layout";

/**
 * Выбор волокон в модуле из фиксированного набора: 1, 2, 4, 6, 8, 10, 12, 16.
 * Кнопки вместо ввода цифрой — на телефоне быстрее и без опечаток.
 */
export function ModuleCapacitySelect({
  name,
  value,
  onChange,
  label = "Волокон в модуле",
  compact = false,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-4 gap-1.5 sm:grid-cols-8"
      >
        {MODULE_CAPACITIES.map((capacity) => {
          const active = capacity === value;
          return (
            <button
              key={capacity}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(capacity)}
              className={`rounded-lg border font-semibold tabular-nums transition ${
                compact ? "py-1 text-[12.5px]" : "py-1.5 text-[13px]"
              } ${
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-line)] bg-white text-[var(--color-ink-700)] hover:border-[var(--color-accent)]"
              }`}
            >
              {capacity}
            </button>
          );
        })}
      </div>
    </div>
  );
}
