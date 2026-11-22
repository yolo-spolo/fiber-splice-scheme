"use client";

import {
  CABLE_STANDARDS,
  CABLE_TEMPLATES,
  type CableStandard,
  type CableTemplate,
  templateCapacity,
  templateFiberLabel,
} from "@/lib/cable-templates";

/**
 * Готовые шаблоны кабеля: раскладка и стандарт цветовки одним нажатием.
 *
 * Сварщику не нужно помнить, что 16 волокон бывает в двух трубках по 8 —
 * он видит кнопку «2 × 8» и нажимает. Стандарт переключается рядом и
 * применяется к следующему нажатию, поэтому «ГОСТ» и «Европа» не спорят.
 */
export function CableTemplatePicker({
  fiberCount,
  moduleCount,
  scheme,
  onStandardChange,
  onPick,
  compact = false,
}: {
  fiberCount: number;
  moduleCount: number;
  scheme: string;
  onStandardChange: (standard: CableStandard) => void;
  onPick: (template: CableTemplate) => void;
  compact?: boolean;
}) {
  // Ёмкость не передаём: шаблон опознаётся по волокнам и модулям, а ёмкость
  // всё равно выводится из них.
  const active = (template: CableTemplate) =>
    template.fiberCount === fiberCount &&
    template.moduleCount === moduleCount;

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-2">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-[10.5px] uppercase tracking-wide text-[var(--color-ink-400)]">
          Шаблоны кабеля
        </span>
        <div role="radiogroup" aria-label="Стандарт цветовки" className="flex gap-1">
          {CABLE_STANDARDS.map((standard) => {
            const current = scheme === standard.value;
            return (
              <button
                key={standard.value}
                type="button"
                role="radio"
                aria-checked={current}
                title={standard.hint}
                onClick={() => onStandardChange(standard.value)}
                className={`rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold transition ${
                  current
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              : "border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-500)] hover:border-[var(--color-accent)]"
                }`}
              >
                {standard.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CABLE_TEMPLATES.map((template) => {
          const current = active(template);
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onPick(template)}
              title={`${templateFiberLabel(template)} · ${template.moduleCount} × ${templateCapacity(template)}${
                template.moduleColors.length > 0 ? " · белая трубка" : ""
              }`}
              className={`rounded-lg border px-2 py-1 font-semibold tabular-nums transition ${
                compact ? "text-[11.5px]" : "text-[12.5px]"
              } ${
                current
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            : "border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-accent)]"
              }`}
            >
              {template.label}
              {template.moduleCount > 1 && (
                <span className="ml-1 font-normal text-[10px] opacity-70">
                  · {template.fiberCount} вол.
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-1 text-[10.5px] text-[var(--color-ink-400)]">
        Одна трубка — белая, в многомодульных трубки по стандарту. Ёмкость модуля
        считается сама.
      </p>
    </div>
  );
}
