"use client";

import { useState } from "react";
import {
  colorByCode,
  COLOR_SCHEMES,
  colorsForScheme,
  moduleColorCodes,
  schemeOrder,
  swatchBackground,
} from "@/lib/colors";

/**
 * Цветовка кабеля: отдельно модули (трубки) и отдельно жилы.
 *
 * Модули по умолчанию идут по стандарту — первый синий, второй оранжевый.
 * Любой модуль можно перекрасить вручную; «Авто» возвращает его к схеме.
 * Жилы задаются схемой или своим порядком.
 */
export function ColorSchemeSelect({
  scheme,
  onSchemeChange,
  colorOrder,
  onColorOrderChange,
  moduleColors,
  onModuleColorsChange,
  moduleCapacity,
  moduleCount,
  compact = false,
}: {
  scheme: string;
  onSchemeChange: (scheme: string) => void;
  colorOrder: number[];
  onColorOrderChange: (order: number[]) => void;
  moduleColors: number[];
  onModuleColorsChange: (colors: number[]) => void;
  moduleCapacity: number;
  moduleCount: number;
  compact?: boolean;
}) {
  const [editingFibers, setEditingFibers] = useState(false);
  const [editingModule, setEditingModule] = useState<number | null>(null);

  const palette = colorsForScheme(scheme, moduleCapacity, colorOrder);
  const order = colorOrder.length === moduleCapacity ? colorOrder : [...palette];
  const modulePalette = moduleColorCodes(moduleCount, scheme, moduleColors);

  function setFiberColor(index: number, code: number) {
    const next = [...order];
    next[index] = code;
    onColorOrderChange(next);
  }

  function setModuleColor(index: number, code: number) {
    const next = Array.from({ length: Math.max(moduleCount, moduleColors.length) }, (_, i) => {
      const current = moduleColors[i];
      return Number.isInteger(current) ? current : -1;
    });
    next[index] = code;
    onModuleColorsChange(next);
    setEditingModule(null);
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-[var(--color-line)] bg-white p-2.5">
      <input type="hidden" name="colorScheme" value={scheme} />
      <input type="hidden" name="colorOrder" value={JSON.stringify(order)} />
      <input type="hidden" name="moduleColors" value={JSON.stringify(moduleColors)} />

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="label !mb-0">Цвета модулей</span>
          <span className="text-[10.5px] text-[var(--color-ink-400)]">
            по стандарту, можно перекрасить
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {Array.from({ length: Math.max(1, moduleCount) }, (_, index) => {
            const code = modulePalette[index] ?? 0;
            const color = colorByCode(code);
            const active = editingModule === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setEditingModule(active ? null : index)}
                title={`Модуль ${index + 1} — ${color.name}`}
                aria-label={`Модуль ${index + 1}, ${color.name}`}
                className={`flex h-7 min-w-[30px] items-center justify-center rounded-md border px-1 text-[10.5px] font-bold tabular-nums transition ${
                  active
                    ? "border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/35"
                    : "border-black/25 hover:scale-105"
                }`}
                style={swatchBackground(code)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {editingModule !== null && (
          <div className="mt-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-1.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold">
                Модуль {editingModule + 1}: {colorByCode(modulePalette[editingModule] ?? 0).name.toLowerCase()}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="text-[11px] font-semibold text-[var(--color-accent)]"
                  onClick={() => setModuleColor(editingModule, -1)}
                >
                  Авто
                </button>
                <button
                  type="button"
                  className="text-[13px] leading-none text-[var(--color-ink-400)]"
                  onClick={() => setEditingModule(null)}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 24 }, (_, code) => {
                const color = colorByCode(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setModuleColor(editingModule, code)}
                    title={color.name}
                    aria-label={color.name}
                    className="h-5 rounded-[3px] border border-black/25 transition hover:scale-110"
                    style={swatchBackground(code)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-line)] pt-2">
        <span className="label">Цветовка жил</span>
        <div className={`grid gap-1.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          {COLOR_SCHEMES.map((item) => {
            const active = item.value === scheme;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onSchemeChange(item.value);
                  onColorOrderChange([...schemeOrder(item.value)]);
                  setEditingFibers(item.value === "CUSTOM");
                }}
                title={item.hint}
                className={`rounded-lg border px-2 py-1.5 text-left text-[12px] font-semibold transition ${
                  active
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-[var(--color-line)] bg-white hover:border-[var(--color-accent)]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {palette.map((code, index) => {
            const color = colorByCode(code);
            return (
              <span
                key={index}
                className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-black/25 text-[9px] font-bold"
                style={swatchBackground(code)}
                title={`${index + 1} · ${color.name}`}
              >
                {index + 1}
              </span>
            );
          })}
        </div>

        {scheme === "CUSTOM" && (
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-ghost px-2 py-0.5 text-[11.5px]"
              onClick={() => setEditingFibers((value) => !value)}
            >
              {editingFibers ? "Свернуть редактор" : "Изменить цвета жил"}
            </button>

            {editingFibers && (
              <div className="mt-2 space-y-1.5">
                {order.map((code, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 text-[11px] tabular-nums text-[var(--color-ink-400)]">
                      {index + 1}
                    </span>
                    <select
                      className="field !py-1 text-[12px]"
                      value={code}
                      onChange={(e) => setFiberColor(index, Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, value) => value).map((value) => (
                        <option key={value} value={value}>
                          {colorByCode(value).name}
                        </option>
                      ))}
                    </select>
                    <span
                      className="h-5 w-5 shrink-0 rounded-[3px] border border-black/25"
                      style={swatchBackground(code)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
