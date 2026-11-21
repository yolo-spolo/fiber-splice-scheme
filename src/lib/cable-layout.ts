import { colorsForScheme } from "./colors";

/** Допустимые ёмкости модуля. Стандарт — 12, но бывают и 1, 2, 4, 6, 8, 10, 16. */
export const MODULE_CAPACITIES = [1, 2, 4, 6, 8, 10, 12, 16] as const;

export type ModuleCapacity = (typeof MODULE_CAPACITIES)[number];

/** Ёмкость по умолчанию, когда считать нечего: пустые поля в форме. */
const DEFAULT_MODULE_CAPACITY: ModuleCapacity = 12;

export function isModuleCapacity(value: number): value is ModuleCapacity {
  return (MODULE_CAPACITIES as readonly number[]).includes(value);
}

/**
 * Ёмкость модуля сварщик не задаёт — она выводится из двух чисел:
 * сколько волокон и сколько трубок. Берём наименьшую стандартную ёмкость,
 * в которую помещается «волокон / модулей»:
 *
 *   24 волокна, 2 модуля → 12      16 волокон, 2 модуля → 8
 *   48 волокон, 6 модулей → 8      14 волокон, 1 модуль → 16
 *
 * Если не хватает даже 16 (24 волокна в одной трубке), возвращаем 16:
 * раскладка честно покажет нехватку, а не спрячет её.
 */
export function deriveModuleCapacity(fiberCount: number, moduleCount: number): ModuleCapacity {
  const total = Math.max(0, Math.floor(fiberCount) || 0);
  const modules = Math.max(0, Math.floor(moduleCount) || 0);
  if (total === 0 || modules === 0) return DEFAULT_MODULE_CAPACITY;
  const needed = Math.ceil(total / modules);
  return MODULE_CAPACITIES.find((capacity) => capacity >= needed) ?? 16;
}

/**
 * Раскладка кабеля по модулям. Сварщик задаёт только волокна и модули,
 * ёмкость выводится автоматически. Модули заполняются по порядку,
 * последний может быть неполным.
 */
export function cableLayout(fiberCount: number, moduleCount: number) {
  const total = Math.max(0, Math.floor(fiberCount) || 0);
  const modules = Math.max(0, Math.floor(moduleCount) || 0);
  const perModule = deriveModuleCapacity(total, modules);
  const capacity = modules * perModule;
  const filledModules = total === 0 ? 0 : Math.ceil(total / perModule);
  const freeSlots = Math.max(0, capacity - total);
  const emptyModules = Math.max(0, modules - filledModules);
  const fits = total <= capacity;
  const overflow = Math.max(0, total - capacity);

  return {
    fiberCount: total,
    moduleCount: modules,
    moduleCapacity: perModule,
    capacity,
    filledModules,
    fullModules: Math.floor(total / perModule),
    remainder: total % perModule,
    freeSlots,
    emptyModules,
    fits,
    overflow,
    /** Подпись вида «2 модуля × 12 = 24 места». */
    summary:
      modules === 0
        ? "модулей нет"
        : `${modules} ${plural(modules, "модуль", "модуля", "модулей")} × ${perModule} = ${capacity} ${
            plural(capacity, "место", "места", "мест")
          }`,
  };
}

export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/**
 * Сколько модулей нужно для введённого числа волокон. Считаем по 12:
 * модуль на 16 повторил бы цвета 1–4 на позициях 13–16.
 */
export function suggestModuleCount(fiberCount: number): number {
  const total = Math.max(1, Math.floor(fiberCount) || 0);
  return Math.max(1, Math.ceil(total / 12));
}

/** Позиция волокна внутри модуля → код цвета TIA-598. */
export function colorCodeForPosition(position: number): number {
  return (position - 1) % 12;
}

/**
 * Раскладка волокон для записи в БД. Порядок модулей и позиций строго
 * последовательный — на этом построены адресация и схема.
 */
export function buildFibers(
  fiberCount: number,
  moduleCount: number,
  colorScheme = "TIA598",
  colorOrder: number[] = [],
) {
  const perModule = deriveModuleCapacity(fiberCount, moduleCount);
  const palette = colorsForScheme(colorScheme, perModule, colorOrder);
  return Array.from({ length: fiberCount }, (_, i) => ({
    moduleIndex: Math.floor(i / perModule) + 1,
    position: (i % perModule) + 1,
    colorCode: palette[i % perModule],
  }));
}
