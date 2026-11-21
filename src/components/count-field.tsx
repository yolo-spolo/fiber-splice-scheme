"use client";

import { cableLayout, plural } from "@/lib/cable-layout";

/**
 * Числовое поле, в котором можно спокойно стереть значение и набрать новое.
 * Раньше пустая строка сразу превращалась в 1, и ввести «24» с телефона
 * было почти невозможно.
 */
export function CountField({
  label,
  name,
  value,
  onChange,
  min = 1,
  max = 1152,
  placeholder,
  hint,
  className,
}: {
  label?: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  const number = Number(value);
  const invalid = value !== "" && (!Number.isFinite(number) || number < min || number > max);

  return (
    <label className={`block ${className ?? ""}`}>
      {label && <span className="label">{label}</span>}
      <input
        className={`field tabular-nums ${invalid ? "!border-[var(--color-danger)]" : ""}`}
        type="number"
        name={name}
        min={min}
        max={max}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && !invalid && (
        <span className="mt-0.5 block text-[10.5px] text-[var(--color-ink-400)]">{hint}</span>
      )}
      {invalid && (
        <span className="mt-0.5 block text-[10.5px] text-[var(--color-danger)]">
          От {min} до {max}
        </span>
      )}
    </label>
  );
}

/**
 * Подсказка под полями: какая ёмкость модуля получится из введённых чисел.
 * Сварщик задаёт только волокна и модули — ёмкость считается сама.
 */
export function ModuleCountHint({
  fiberCount,
  moduleCount,
}: {
  fiberCount: number;
  moduleCount: number;
}) {
  if (!Number.isFinite(fiberCount) || fiberCount < 1) return null;
  const layout = cableLayout(fiberCount, moduleCount);
  if (layout.moduleCount === 0) return null;

  return (
    <p className="text-[10.5px] text-[var(--color-ink-400)]">
      {layout.moduleCount} {plural(layout.moduleCount, "модуль", "модуля", "модулей")} по{" "}
      {layout.moduleCapacity} — ёмкость считается автоматически
      {layout.fits ? "" : " · не помещается, добавьте модули"}
    </p>
  );
}
