"use client";

import { useState } from "react";
import { createCable } from "@/lib/actions/cables";
import { CABLE_SHEATH_COLORS } from "@/lib/cable-types";
import { Field, Select, SubmitButton } from "@/components/ui/fields";
import { CableLayoutPreview } from "@/components/cable-layout-preview";
import { ModuleCapacitySelect } from "@/components/module-capacity-select";
import { ColorSchemeSelect } from "@/components/color-scheme-select";

const FIBER_PRESETS = [4, 8, 12, 24, 48, 96];

export function NewCableDialog({
  closureId,
  trigger = "Добавить кабель",
  cableTypes,
}: {
  closureId: string;
  trigger?: string;
  cableTypes: {
    id: string;
    name: string;
    fiberCount: number;
    moduleCount: number;
    moduleCapacity: number;
    colorScheme: string;
    colorOrder: number[];
    ownership: string;
    sheathColor: string | null;
    note: string | null;
  }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeName, setTypeName] = useState("");
  const [count, setCount] = useState(24);
  const [modules, setModules] = useState(1);
  const [moduleCapacity, setModuleCapacity] = useState(12);
  const [sheathColor, setSheathColor] = useState("");
  const [ownership, setOwnership] = useState("OURS");
  const [colorScheme, setColorScheme] = useState("TIA598");
  const [colorOrder, setColorOrder] = useState<number[]>([]);

  function applyType(id: string) {
    const preset = cableTypes.find((t) => t.id === id);
    if (!preset) {
      setTypeName("");
      return;
    }
    setTypeName(preset.name);
    setCount(preset.fiberCount);
    setModules(preset.moduleCount);
    setModuleCapacity(preset.moduleCapacity);
    setSheathColor(preset.sheathColor ?? "");
    setOwnership(preset.ownership);
    setColorScheme(preset.colorScheme);
    setColorOrder(preset.colorOrder);
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        {trigger}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink-950)]/45 sm:items-center sm:p-4">
          <div className="max-h-[92dvh] w-full max-w-[600px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px]">Новый кабель</h2>
                <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
                  Выберите тип кабеля — параметры подставятся автоматически
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost h-8 w-8 !p-0 text-[16px]"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            {error && (
              <p className="mb-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-danger)]">
                {error}
              </p>
            )}

            <form
              action={async (formData) => {
                const res = await createCable(formData);
                if (res?.error) setError(res.error);
                else {
                  setError(null);
                  setOpen(false);
                }
              }}
              className="space-y-3"
            >
              <input type="hidden" name="closureId" value={closureId} />

              <Field label="Метка кабеля" name="label" required placeholder="К1 / магистраль" autoFocus />

              <label className="block">
                <span className="label">Тип кабеля</span>
                <select
                  className="field"
                  value={cableTypes.find((t) => t.name === typeName)?.id ?? ""}
                  onChange={(e) => applyType(e.target.value)}
                >
                  <option value="">— свой вариант —</option>
                  {cableTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.fiberCount} вол., {t.moduleCount} × {t.moduleCapacity}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11.5px] text-[var(--color-ink-400)]">
                  Справочник типов настраивается в «Справочниках»
                </span>
              </label>

              <Field
                label="Название типа в схеме"
                name="type"
                defaultValue={typeName}
                placeholder="Воздушный подвесной"
                key={`type-${typeName}`}
              />

              <div>
                <span className="label">Количество волокон</span>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {FIBER_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCount(n)}
                      className={`chip cursor-pointer px-2.5 py-1 ${
                        count === n ? "!border-[var(--color-accent)] !bg-[var(--color-accent-soft)]" : ""
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  className="field"
                  type="number"
                  name="fiberCount"
                  min={1}
                  max={1152}
                  required
                  inputMode="numeric"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(1152, Number(e.target.value) || 1)))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Количество модулей</span>
                  <input
                    className="field"
                    type="number"
                    name="moduleCount"
                    min={1}
                    max={96}
                    required
                    inputMode="numeric"
                    value={modules}
                    onChange={(e) => setModules(Math.max(1, Math.min(96, Number(e.target.value) || 1)))}
                  />
                </label>
                <ModuleCapacitySelect
                  name="moduleCapacity"
                  value={moduleCapacity}
                  onChange={setModuleCapacity}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Принадлежность</span>
                  <select
                    className="field"
                    name="ownership"
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value)}
                  >
                    <option value="OURS">Наш кабель</option>
                    <option value="FOREIGN">Чужой / транзитный</option>
                  </select>
                </label>
                <label className="block">
                  <span className="label">Цвет оболочки</span>
                  <select
                    className="field"
                    name="sheathColor"
                    value={sheathColor}
                    onChange={(e) => setSheathColor(e.target.value)}
                  >
                    <option value="">— не указан —</option>
                    {CABLE_SHEATH_COLORS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <CableLayoutPreview fiberCount={count} moduleCount={modules} moduleCapacity={moduleCapacity} />

              <ColorSchemeSelect
                scheme={colorScheme}
                onSchemeChange={setColorScheme}
                colorOrder={colorOrder}
                onColorOrderChange={setColorOrder}
                moduleCapacity={moduleCapacity}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Откуда" name="fromLocation" placeholder="ОРШ-3" />
                <Field label="Куда" name="toLocation" placeholder="Колодец К-14" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Отмена
                </button>
                <SubmitButton>Добавить кабель</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
