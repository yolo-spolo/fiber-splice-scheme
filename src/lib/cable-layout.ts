import { colorsForScheme } from "./colors";

/** Допустимые ёмкости модуля. Стандарт — 12, но бывают и 1, 2, 4, 6, 8, 10, 16. */
export const MODULE_CAPACITIES = [1, 2, 4, 6, 8, 10, 12, 16] as const;

export type ModuleCapacity = (typeof MODULE_CAPACITIES)[number];

export function isModuleCapacity(value: number): value is ModuleCapacity {
  return (MODULE_CAPACITIES as readonly number[]).includes(value);
}

/**
 * Раскладка кабеля по модулям. Сварщик задаёт три числа вручную:
 * волокон, модулей и волокон в модуле. Модули заполняются по порядку,
 * последний может быть неполным.
 */
export function cableLayout(fiberCount: number, moduleCount: number, moduleCapacity: number) {
  const perModule = isModuleCapacity(moduleCapacity) ? moduleCapacity : 12;
  const total = Math.max(0, Math.floor(fiberCount) || 0);
  const modules = Math.max(0, Math.floor(moduleCount) || 0);
  const capacity = modules * perModule;
  const filledModules = total === 0 ? 0 : Math.ceil(total / perModule);
  const remainder = total === 0 ? 0 : total % perModule || perModule;
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
    /** Подпись вида «24 волокна · 2 модуля × 12». */
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
 * Готовые раскладки для числа волокон: 16 можно собрать как 1×16 или 4×4.
 * Возвращает варианты «модулей × волокон в модуле» из допустимых ёмкостей,
 * от самого плотного к самому распределённому.
 */
export function layoutOptions(fiberCount: number): { moduleCount: number; moduleCapacity: number }[] {
  const total = Math.max(1, Math.floor(fiberCount) || 0);
  const options: { moduleCount: number; moduleCapacity: number }[] = [];
  for (const capacity of MODULE_CAPACITIES) {
    const moduleCount = Math.ceil(total / capacity);
    if (moduleCount > 96) continue;
    // Показываем только раскладки без пустых модулей: 16 в 4×6 даёт лишний пустой.
    if ((moduleCount - 1) * capacity >= total) continue;
    options.push({ moduleCount, moduleCapacity: capacity });
  }
  // Сначала варианты без свободных мест (24 = 2×12, а не 2×16), затем по числу
  // модулей: сварщику привычнее начать с самого плотного.
  const freeSlots = (o: { moduleCount: number; moduleCapacity: number }) =>
    o.moduleCount * o.moduleCapacity - total;
  return options.sort(
    (a, b) =>
      freeSlots(a) - freeSlots(b) ||
      a.moduleCount - b.moduleCount ||
      b.moduleCapacity - a.moduleCapacity,
  );
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
  moduleCapacity: number,
  colorScheme = "TIA598",
  colorOrder: number[] = [],
) {
  const perModule = Math.max(1, moduleCapacity);
  const palette = colorsForScheme(colorScheme, perModule, colorOrder);
  return Array.from({ length: fiberCount }, (_, i) => ({
    moduleIndex: Math.floor(i / perModule) + 1,
    position: (i % perModule) + 1,
    colorCode: palette[i % perModule],
  }));
}
