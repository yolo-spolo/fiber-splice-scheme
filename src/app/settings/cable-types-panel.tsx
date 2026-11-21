"use client";

import { useState, useTransition } from "react";
import { createCableType, deleteCableType, updateCableType } from "@/lib/actions/cable-types";
import { CABLE_SHEATH_COLORS } from "@/lib/cable-types";
import { Field, SubmitButton, Textarea } from "@/components/ui/fields";
import { CableLayoutPreview } from "@/components/cable-layout-preview";
import { ColorSchemeSelect } from "@/components/color-scheme-select";
import { CountField, ModuleCountHint } from "@/components/count-field";
import { CableTemplatePicker } from "@/components/cable-template-picker";
import { type CableStandard, type CableTemplate } from "@/lib/cable-templates";
import { cableLayout } from "@/lib/cable-layout";

type Preset = {
  id: string;
  name: string;
  fiberCount: number;
  moduleCount: number;
  colorScheme: string;
  moduleColors: number[];
  ownership: string;
  sheathColor: string | null;
  note: string | null;
  isBuiltIn: boolean;
};

export function CableTypesPanel({ presets }: { presets: Preset[] }) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<{ kind: "new" } | { kind: "edit"; preset: Preset } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countText, setCountText] = useState("8");
  const [modulesText, setModulesText] = useState("1");
  const [colorScheme, setColorScheme] = useState("TIA598");
  const [colorOrder, setColorOrder] = useState<number[]>([]);
  const [moduleColors, setModuleColors] = useState<number[]>([]);

  const count = Number(countText) || 0;
  const modules = Number(modulesText) || 0;

  function applyTemplate(template: CableTemplate) {
    setCountText(String(template.fiberCount));
    setModulesText(String(template.moduleCount));
    setModuleColors(template.moduleColors);
    setColorOrder([]);
  }

  function openNew() {
    setError(null);
    setCountText("8");
    setModulesText("1");
    setColorScheme("TIA598");
    setColorOrder([]);
    setModuleColors([]);
    setMode({ kind: "new" });
  }

  function openEdit(preset: Preset) {
    setError(null);
    setCountText(String(preset.fiberCount));
    setModulesText(String(preset.moduleCount));
    setColorScheme(preset.colorScheme);
    setColorOrder([]);
    setModuleColors(preset.moduleColors ?? []);
    setMode({ kind: "edit", preset });
  }

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px]">Типы кабелей</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
            Шаблоны с параметрами по умолчанию — при добавлении кабеля в муфту достаточно выбрать тип
          </p>
        </div>
        <button type="button" className="btn btn-ghost px-2.5 py-1 text-[12.5px]" onClick={openNew}>
          + Свой тип
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {mode && (
        <div className="mb-3 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]/25 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">
              {mode.kind === "new" ? "Новый тип кабеля" : `Изменить «${mode.preset.name}»`}
            </span>
            <button type="button" className="text-[15px] text-[var(--color-ink-400)]" onClick={() => setMode(null)}>
              ×
            </button>
          </div>
          <form
            action={async (formData) => {
              const res =
                mode.kind === "new"
                  ? await createCableType(formData)
                  : await updateCableType(mode.preset.id, formData);
              if (res?.error) setError(res.error);
              else {
                setError(null);
                setMode(null);
              }
            }}
            className="space-y-2.5"
          >
            <Field
              label="Название"
              name="name"
              required
              autoFocus
              defaultValue={mode.kind === "edit" ? mode.preset.name : ""}
              placeholder="Воздушный подвесной"
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
              compact
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <CountField
                label="Волокон"
                name="fiberCount"
                value={countText}
                onChange={setCountText}
                max={1152}
              />
              <CountField
                label="Модулей"
                name="moduleCount"
                value={modulesText}
                onChange={setModulesText}
                max={96}
              />
            </div>
            <ModuleCountHint fiberCount={count} moduleCount={modules} />
            <CableLayoutPreview
              fiberCount={count}
              moduleCount={modules}
              scheme={colorScheme}
              colorOrder={colorOrder}
              moduleColors={moduleColors}
              onFix={(next) => setModulesText(String(next.moduleCount))}
              compact
            />
            <ColorSchemeSelect
              scheme={colorScheme}
              onSchemeChange={setColorScheme}
              colorOrder={colorOrder}
              onColorOrderChange={setColorOrder}
              moduleColors={moduleColors}
              onModuleColorsChange={setModuleColors}
              moduleCapacity={cableLayout(count, modules).moduleCapacity}
              moduleCount={modules}
              compact
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <label className="block">
                <span className="label">Принадлежность</span>
                <select
                  className="field"
                  name="ownership"
                  defaultValue={mode.kind === "edit" ? mode.preset.ownership : "OURS"}
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
                  defaultValue={mode.kind === "edit" ? (mode.preset.sheathColor ?? "") : "Чёрный"}
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
            <Textarea
              label="Примечание"
              name="note"
              rows={2}
              defaultValue={mode.kind === "edit" ? mode.preset.note : ""}
              placeholder="Например: самонесущий, между опорами"
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost px-2.5 py-1 text-[12.5px]" onClick={() => setMode(null)}>
                Отмена
              </button>
              <SubmitButton className="btn btn-primary px-3 py-1 text-[12.5px]">Сохранить</SubmitButton>
            </div>
          </form>
        </div>
      )}

      <ul className="space-y-1.5">
        {presets.map((preset) => (
          <li
            key={preset.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[var(--color-line)] px-2.5 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13.5px] font-semibold">{preset.name}</span>
                {preset.ownership === "FOREIGN" && (
                  <span className="chip !py-0 text-[10px] !text-[var(--color-warn)]">чужой</span>
                )}
              </div>
              <div className="text-[11.5px] text-[var(--color-ink-500)]">
                {preset.fiberCount} вол. · {preset.moduleCount} ×{" "}
                {cableLayout(preset.fiberCount, preset.moduleCount).moduleCapacity}
                {preset.note ? ` · ${preset.note}` : ""}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost px-2 py-0.5 text-[11.5px]"
              onClick={() => openEdit(preset)}
            >
              Изменить
            </button>
            <button
              type="button"
              className="btn btn-danger px-2 py-0.5 text-[11.5px]"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Удалить тип «${preset.name}»? Уже добавленные кабели не изменятся.`)) return;
                start(async () => {
                  await deleteCableType(preset.id);
                });
              }}
            >
              Удалить
            </button>
          </li>
        ))}
        {presets.length === 0 && (
          <li className="rounded-lg border border-dashed border-[var(--color-line)] px-3 py-4 text-center text-[12.5px] text-[var(--color-ink-500)]">
            Типов пока нет — добавьте первый, например «Воздушный подвесной, 8 волокон»
          </li>
        )}
      </ul>
    </section>
  );
}
