"use client";

import { useState } from "react";
import { colorByCode, COLOR_SCHEMES, colorsForScheme, schemeOrder } from "@/lib/colors";

/**
 * Выбор цветовки жил кабеля. Стандартные схемы показывают готовую полосу цветов,
 * «свой порядок» позволяет назначить цвет каждой жиле вручную.
 */
export function ColorSchemeSelect({
  scheme,
  onSchemeChange,
  colorOrder,
  onColorOrderChange,
  moduleCapacity,
  compact = false,
}: {
  scheme: string;
  onSchemeChange: (scheme: string) => void;
  colorOrder: number[];
  onColorOrderChange: (order: number[]) => void;
  moduleCapacity: number;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const palette = colorsForScheme(scheme, moduleCapacity, colorOrder);

  const order = colorOrder.length === moduleCapacity ? colorOrder : [...palette];

  function setFiberColor(index: number, code: number) {
    const next = [...order];
    next[index] = code;
    onColorOrderChange(next);
  }

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-white p-2.5">
      <input type="hidden" name="colorScheme" value={scheme} />
      <input type="hidden" name="colorOrder" value={JSON.stringify(order)} />

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
                setEditing(item.value === "CUSTOM");
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
              style={{
                background: color.hex,
                color: isDark(color.hex) ? "#fff" : "#111827",
                backgroundImage: color.striped
                  ? "repeating-linear-gradient(45deg, rgba(0,0,0,.55) 0 2px, transparent 2px 5px)"
                  : undefined,
              }}
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
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Свернуть редактор" : "Изменить цвета"}
          </button>

          {editing && (
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
                    style={{ background: colorByCode(code).hex }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function isDark(hex: string): boolean {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}
