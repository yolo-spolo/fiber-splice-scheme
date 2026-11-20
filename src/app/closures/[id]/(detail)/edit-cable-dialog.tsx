"use client";

import { useState } from "react";
import { updateCable } from "@/lib/actions/cables";
import { CABLE_SHEATH_COLORS } from "@/lib/cable-types";
import { Field, SubmitButton, Textarea } from "@/components/ui/fields";
import { CableLayoutPreview } from "@/components/cable-layout-preview";
import { ModuleCapacitySelect } from "@/components/module-capacity-select";
import { ColorSchemeSelect } from "@/components/color-scheme-select";

type EditableCable = {
  id: string;
  label: string;
  type: string | null;
  fiberCount: number;
  moduleCount: number;
  moduleCapacity: number;
  colorScheme: string;
  colorOrder: number[];
  fromLocation: string | null;
  toLocation: string | null;
  ownership: string;
  sheathColor: string | null;
  notes: string | null;
};

export function EditCableDialog({
  cable,
  splicedCount,
  onClose,
}: {
  cable: EditableCable;
  splicedCount: number;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(cable.fiberCount);
  const [modules, setModules] = useState(cable.moduleCount);
  const [moduleCapacity, setModuleCapacity] = useState(cable.moduleCapacity);
  const [ownership, setOwnership] = useState(cable.ownership);
  const [sheathColor, setSheathColor] = useState(cable.sheathColor ?? "");
  const [colorScheme, setColorScheme] = useState(cable.colorScheme);
  const [colorOrder, setColorOrder] = useState<number[]>(cable.colorOrder);

  const layoutChanged =
    count !== cable.fiberCount ||
    moduleCapacity !== cable.moduleCapacity ||
    modules !== cable.moduleCount ||
    colorScheme !== cable.colorScheme ||
    JSON.stringify(colorOrder) !== JSON.stringify(cable.colorOrder);
  const willRemoveSpliced = splicedCount > 0 && count < cable.fiberCount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink-950)]/45 sm:items-center sm:p-4"
    >
      <div className="max-h-[92dvh] w-full max-w-[600px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px]">Кабель {cable.label}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
              Изменения применяются к схеме сразу
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost h-8 w-8 !p-0 text-[16px]"
            onClick={onClose}
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
            const res = await updateCable(cable.id, formData);
            if (res?.error) setError(res.error);
            else onClose();
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Метка кабеля" name="label" required defaultValue={cable.label} autoFocus />
            <Field label="Тип" name="type" defaultValue={cable.type} placeholder="Воздушный подвесной" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Волокон</span>
              <input
                className="field"
                type="number"
                name="fiberCount"
                min={1}
                max={1152}
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(1152, Number(e.target.value) || 1)))}
              />
            </label>
            <label className="block">
              <span className="label">Модулей</span>
              <input
                className="field"
                type="number"
                name="moduleCount"
                min={1}
                max={96}
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

          <CableLayoutPreview fiberCount={count} moduleCount={modules} moduleCapacity={moduleCapacity} />

          <ColorSchemeSelect
            scheme={colorScheme}
            onSchemeChange={setColorScheme}
            colorOrder={colorOrder}
            onColorOrderChange={setColorOrder}
            moduleCapacity={moduleCapacity}
          />

          {layoutChanged && splicedCount > 0 && (
            <p
              className={`rounded-lg px-3 py-2 text-[12px] ${
                willRemoveSpliced
                  ? "bg-[var(--color-warn-soft)] text-[var(--color-warn)]"
                  : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
              }`}
            >
              {willRemoveSpliced
                ? `В кабеле ${splicedCount} сваренных волокон. Уменьшение удалит только свободные волокна; если сваренных станет не хватать, сохранение остановится.`
                : `Сварки сохранятся: волокна с номерами до ${cable.fiberCount} останутся на месте.`}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Откуда" name="fromLocation" defaultValue={cable.fromLocation} />
            <Field label="Куда" name="toLocation" defaultValue={cable.toLocation} />
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

          <Textarea label="Заметки" name="notes" rows={2} defaultValue={cable.notes} />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <SubmitButton>Сохранить</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
