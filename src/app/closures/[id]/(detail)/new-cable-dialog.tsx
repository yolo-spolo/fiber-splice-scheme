"use client";

import { useState } from "react";
import { createCable } from "@/lib/actions/cables";
import { CABLE_SHEATH_COLORS } from "@/lib/cable-types";
import { Field, SubmitButton } from "@/components/ui/fields";
import { CableLayoutPreview } from "@/components/cable-layout-preview";
import { ColorSchemeSelect } from "@/components/color-scheme-select";
import { CountField, ModuleCountHint } from "@/components/count-field";
import { CableTemplatePicker } from "@/components/cable-template-picker";
import { type CableStandard, type CableTemplate } from "@/lib/cable-templates";
import { cableLayout } from "@/lib/cable-layout";
import { ClosurePicker } from "@/components/closure-picker";
import type { ClosureOption } from "@/lib/cable-endpoints";

export function NewCableDialog({
  closureId,
  trigger = "Добавить кабель",
  cableTypes,
  closures = [],
}: {
  closureId: string;
  trigger?: string;
  cableTypes: {
    id: string;
    name: string;
    fiberCount: number;
    moduleCount: number;
    colorScheme: string;
    colorOrder: number[];
    moduleColors?: number[];
    ownership: string;
    sheathColor: string | null;
    note: string | null;
  }[];
  closures?: ClosureOption[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeName, setTypeName] = useState("");
  // 24 волокна в одном модуле не помещаются: диалог открывался
  // с красной плашкой. По умолчанию — 24 волокна в 2 модулях.
  const [countText, setCountText] = useState("24");
  const [modulesText, setModulesText] = useState("2");
  const [sheathColor, setSheathColor] = useState("");
  const [ownership, setOwnership] = useState("OURS");
  const [colorScheme, setColorScheme] = useState("TIA598");
  const [colorOrder, setColorOrder] = useState<number[]>([]);
  const [moduleColors, setModuleColors] = useState<number[]>([]);

  const count = Number(countText) || 0;
  const modules = Number(modulesText) || 0;
  const layout = cableLayout(count, modules);

  function applyType(id: string) {
    const preset = cableTypes.find((t) => t.id === id);
    if (!preset) {
      setTypeName("");
      return;
    }
    setTypeName(preset.name);
    setCountText(String(preset.fiberCount));
    setModulesText(String(preset.moduleCount));
    setSheathColor(preset.sheathColor ?? "");
    setOwnership(preset.ownership);
    setColorScheme(preset.colorScheme);
    setColorOrder(preset.colorOrder);
    setModuleColors(preset.moduleColors ?? []);
  }

  /** Шаблон выставляет раскладку и цвета модулей; стандарт остаётся выбранным. */
  function applyTemplate(template: CableTemplate) {
    setCountText(String(template.fiberCount));
    setModulesText(String(template.moduleCount));
    setModuleColors(template.moduleColors);
    setColorOrder([]);
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
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] sm:items-center sm:p-4">
        <div className="max-h-[92dvh] w-full max-w-[600px] overflow-y-auto rounded-t-2xl bg-[var(--color-paper)] p-5 shadow-xl sm:rounded-2xl">
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
                      {t.name} — {t.fiberCount} вол., {t.moduleCount} ×{" "}
                      {cableLayout(t.fiberCount, t.moduleCount).moduleCapacity}
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

              <CableTemplatePicker
                fiberCount={count}
                moduleCount={modules}
                scheme={colorScheme}
                onStandardChange={(standard: CableStandard) => {
                  setColorScheme(standard);
                  setColorOrder([]);
                }}
                onPick={applyTemplate}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <CountField
                  label="Количество волокон"
                  name="fiberCount"
                  value={countText}
                  onChange={setCountText}
                  max={1152}
                  placeholder="24"
                />
                <CountField
                  label="Количество модулей"
                  name="moduleCount"
                  value={modulesText}
                  onChange={setModulesText}
                  max={96}
                  placeholder="1"
                  hint="Сколько трубок в кабеле"
                />
              </div>

              <ModuleCountHint fiberCount={count} moduleCount={modules} />

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

              <CableLayoutPreview
                fiberCount={count}
                moduleCount={modules}
                scheme={colorScheme}
                colorOrder={colorOrder}
                moduleColors={moduleColors}
                onFix={(next) => setModulesText(String(next.moduleCount))}
              />

              <ColorSchemeSelect
                scheme={colorScheme}
                onSchemeChange={setColorScheme}
                colorOrder={colorOrder}
                onColorOrderChange={setColorOrder}
                moduleColors={moduleColors}
                onModuleColorsChange={setModuleColors}
                moduleCapacity={layout.moduleCapacity}
                moduleCount={modules}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <ClosurePicker
                  label="Откуда"
                  name="fromLocation"
                  closureIdName="fromClosureId"
                  closures={closures}
                  placeholder="Муфта объекта или свой адрес"
                />
                <ClosurePicker
                  label="Куда"
                  name="toLocation"
                  closureIdName="toClosureId"
                  closures={closures}
                  placeholder="Муфта объекта или свой адрес"
                />
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
