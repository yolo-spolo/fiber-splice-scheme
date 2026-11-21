"use client";

import { isModuleCapacity, layoutOptions, MODULE_CAPACITIES, plural } from "@/lib/cable-layout";

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
 * Готовые раскладки для введённого числа волокон. 16 волокон — это и один
 * модуль на 16, и 4 модуля по 4. Один тап выставляет оба поля.
 */
export function LayoutSuggestions({
  fiberCount,
  moduleCount,
  moduleCapacity,
  onPick,
}: {
  fiberCount: number;
  moduleCount: number;
  moduleCapacity: number;
  onPick: (layout: { moduleCount: number; moduleCapacity: number }) => void;
}) {
  if (!Number.isFinite(fiberCount) || fiberCount < 1) return null;

  const options = layoutOptions(fiberCount).slice(0, 6);
  const unique = options.filter(
    (option, index) =>
      options.findIndex(
        (other) =>
          other.moduleCount === option.moduleCount &&
          other.moduleCapacity === option.moduleCapacity,
      ) === index,
  );
  if (unique.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-2">
      <div className="mb-1 text-[10.5px] uppercase tracking-wide text-[var(--color-ink-400)]">
        Готовые раскладки
      </div>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((option) => {
          const active =
            option.moduleCount === moduleCount && option.moduleCapacity === moduleCapacity;
          return (
            <button
              key={`${option.moduleCount}-${option.moduleCapacity}`}
              type="button"
              onClick={() => onPick(option)}
              className={`rounded-lg border px-2 py-1 text-[12px] font-semibold tabular-nums transition ${
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-line)] bg-white hover:border-[var(--color-accent)]"
              }`}
              title={`${option.moduleCount} ${plural(
                option.moduleCount,
                "модуль",
                "модуля",
                "модулей",
              )} по ${option.moduleCapacity}`}
            >
              {option.moduleCount} × {option.moduleCapacity}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[10.5px] text-[var(--color-ink-400)]">
        {isModuleCapacity(moduleCapacity)
          ? "Модулей × волокон в модуле. Можно ввести вручную."
          : `Ёмкость модуля должна быть одной из: ${MODULE_CAPACITIES.join(", ")}`}
      </p>
    </div>
  );
}
