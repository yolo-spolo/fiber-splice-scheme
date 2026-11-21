import { cableLayout, plural } from "./cable-layout";

/**
 * Шаблоны кабелей: раскладка и стандарт цветовки одним нажатием.
 *
 * Один источник правды для кнопок в диалоге кабеля и для справочника типов:
 * шаблон меняется здесь — меняется везде. Ёмкость модуля в шаблоне не
 * задаётся: она выводится из волокон и модулей, как и в самом кабеле.
 */
export type CableTemplate = {
  /** Устойчивый ключ, не зависит от названия в справочнике. */
  key: string;
  fiberCount: number;
  moduleCount: number;
  /** Цвета модулей вручную: [5] — белая трубка, [] — по стандарту. */
  moduleColors: number[];
  /** Короткая подпись на кнопке. */
  label: string;
};

/** Код белого цвета в палитре TIA-598. */
export const WHITE_MODULE_COLOR = 5;

/** Стандарты цветовки жил, между которыми переключается сварщик. */
export const CABLE_STANDARDS = [
  { value: "TIA598", label: "ГОСТ", hint: "TIA-598 / ГОСТ: синий, оранжевый, зелёный" },
  { value: "DIN", label: "Европа", hint: "DIN/VDE: красный, зелёный, синий" },
] as const;

export type CableStandard = (typeof CABLE_STANDARDS)[number]["value"];

export function isCableStandard(value: string): value is CableStandard {
  return CABLE_STANDARDS.some((standard) => standard.value === value);
}

/**
 * Семь раскладок. Модуль на 16 волокон намеренно не предлагается: в палитре
 * 12 цветов, и волокна 13–16 повторили бы первые четыре.
 */
export const CABLE_TEMPLATES: CableTemplate[] = [
  { key: "1", fiberCount: 1, moduleCount: 1, moduleColors: [WHITE_MODULE_COLOR], label: "1" },
  { key: "2", fiberCount: 2, moduleCount: 1, moduleColors: [WHITE_MODULE_COLOR], label: "2" },
  { key: "4", fiberCount: 4, moduleCount: 1, moduleColors: [WHITE_MODULE_COLOR], label: "4" },
  { key: "8", fiberCount: 8, moduleCount: 1, moduleColors: [WHITE_MODULE_COLOR], label: "8" },
  { key: "16-2x8", fiberCount: 16, moduleCount: 2, moduleColors: [], label: "2 × 8" },
  { key: "16-4x4", fiberCount: 16, moduleCount: 4, moduleColors: [], label: "4 × 4" },
  { key: "48-6x8", fiberCount: 48, moduleCount: 6, moduleColors: [], label: "6 × 8" },
];

/** Ёмкость модуля в шаблоне — та же, что посчитает форма. */
export function templateCapacity(template: CableTemplate): number {
  return cableLayout(template.fiberCount, template.moduleCount).moduleCapacity;
}

/** «16 волокон» — подпись под кнопкой и в названии типа. */
export function templateFiberLabel(template: CableTemplate): string {
  return `${template.fiberCount} ${plural(
    template.fiberCount,
    "волокно",
    "волокна",
    "волокон",
  )}`;
}

/** Название типа в справочнике: «16 волокон · 2 × 8 (ГОСТ)». */
export function templateName(template: CableTemplate, standard: CableStandard): string {
  const suffix = CABLE_STANDARDS.find((item) => item.value === standard)?.label ?? "ГОСТ";
  const layout = template.moduleCount === 1 ? "" : ` · ${template.label}`;
  return `${templateFiberLabel(template)}${layout} (${suffix})`;
}

export type CableTemplatePreset = {
  name: string;
  fiberCount: number;
  moduleCount: number;
  moduleCapacity: number;
  colorScheme: CableStandard;
  moduleColors: number[];
  ownership: "OURS" | "FOREIGN";
  sheathColor: string | null;
  note: string | null;
};

/** 7 раскладок × 2 стандарта — столько типов создаётся в справочнике. */
export function cableTemplatePresets(): CableTemplatePreset[] {
  // Сначала весь ГОСТ, затем вся Европа: в списке типов так проще искать.
  return CABLE_STANDARDS.flatMap((standard) =>
    CABLE_TEMPLATES.map((template) => ({
      name: templateName(template, standard.value),
      fiberCount: template.fiberCount,
      moduleCount: template.moduleCount,
      moduleCapacity: templateCapacity(template),
      colorScheme: standard.value,
      moduleColors: template.moduleColors,
      ownership: "OURS" as const,
      sheathColor: null,
      note:
        template.moduleColors.length > 0
          ? "Одна трубка, белая"
          : `${template.moduleCount} ${plural(
              template.moduleCount,
              "трубка",
              "трубки",
              "трубок",
            )} по ${templateCapacity(template)}`,
    })),
  );
}
