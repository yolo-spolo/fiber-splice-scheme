export type FiberColor = {
  code: number;
  name: string;
  hex: string;
  short: string;
  striped?: boolean;
};

/**
 * Порядок TIA-598-C. Он же используется в РФ на практике и совпадает
 * с порядком ГОСТ Р 53245 для 12-волоконных модулей.
 * Цвет всегда дублируется номером и подписью — для дальтоников и ч/б печати.
 */
export const FIBER_COLORS: FiberColor[] = [
  { code: 0, name: "Синий", hex: "#1a56db", short: "СИН" },
  { code: 1, name: "Оранжевый", hex: "#ea580c", short: "ОРН" },
  { code: 2, name: "Зелёный", hex: "#16a34a", short: "ЗЕЛ" },
  { code: 3, name: "Коричневый", hex: "#8b4513", short: "КОР" },
  { code: 4, name: "Серый", hex: "#9ca3af", short: "СЕР" },
  { code: 5, name: "Белый", hex: "#ffffff", short: "БЕЛ" },
  { code: 6, name: "Красный", hex: "#dc2626", short: "КРС" },
  { code: 7, name: "Чёрный", hex: "#111827", short: "ЧРН" },
  { code: 8, name: "Жёлтый", hex: "#facc15", short: "ЖЛТ" },
  { code: 9, name: "Фиолетовый", hex: "#7c3aed", short: "ФИО" },
  { code: 10, name: "Розовый", hex: "#ec4899", short: "РОЗ" },
  { code: 11, name: "Бирюзовый", hex: "#06b6d4", short: "БИР" },
];

/**
 * Вторая дюжина — те же цвета с чёрной полосой. Нужна для 24-волоконной
 * цветовки: без неё 13-е волокно не отличить от 1-го.
 */
export const FIBER_COLORS_STRIPED: FiberColor[] = FIBER_COLORS.map((color) => ({
  code: color.code + 12,
  name: `${color.name} с полосой`,
  hex: color.hex,
  short: `${color.short}·П`,
  striped: true,
}));

export const ALL_FIBER_COLORS: FiberColor[] = [...FIBER_COLORS, ...FIBER_COLORS_STRIPED];

export const MODULE_CAPACITY = 12;

/**
 * Схемы цветовки жил. Сварщик выбирает её при создании кабеля:
 * стандартный порядок, все белые с номерами или свой порядок цветов.
 */
export const COLOR_SCHEMES = [
  {
    value: "TIA598",
    label: "TIA-598 / ГОСТ",
    hint: "Синий, оранжевый, зелёный — стандарт РФ и США",
    order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  {
    value: "DIN",
    label: "DIN/VDE (Европа)",
    hint: "Красный, зелёный, синий — европейские кабели",
    order: [6, 2, 0, 8, 5, 4, 3, 9, 11, 7, 1, 10],
  },
  {
    value: "ALL_WHITE",
    label: "Все белые",
    hint: "Одинаковый цвет, маркировка номерами",
    order: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
  {
    value: "CUSTOM",
    label: "Свой порядок",
    hint: "Задать цвет каждой жилы вручную",
    order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
] as const;

export type ColorScheme = (typeof COLOR_SCHEMES)[number]["value"];

export function isColorScheme(value: string): value is ColorScheme {
  return COLOR_SCHEMES.some((scheme) => scheme.value === value);
}

export const WHITE_COLOR_CODE = 5;

/** Порядок цветов для схемы. Неизвестная схема трактуется как стандарт. */
export function schemeOrder(scheme: string): readonly number[] {
  const found = COLOR_SCHEMES.find((item) => item.value === scheme);
  return found ? found.order : COLOR_SCHEMES[0].order;
}

export function schemeLabel(scheme: string): string {
  return COLOR_SCHEMES.find((item) => item.value === scheme)?.label ?? COLOR_SCHEMES[0].label;
}

/**
 * Цвета жил для модуля по выбранной схеме.
 * CUSTOM берёт порядок из массива colorOrder, недостающее добивает стандартом.
 */
export function colorsForScheme(
  scheme: string,
  moduleCapacity: number,
  colorOrder: number[] = [],
): number[] {
  const capacity = Math.max(1, Math.floor(moduleCapacity) || 12);
  const custom = colorOrder.filter((code) => Number.isInteger(code) && code >= 0 && code < 24);
  const base =
    scheme === "CUSTOM" && custom.length > 0 ? custom : [...schemeOrder(scheme)];
  return Array.from({ length: capacity }, (_, index) => {
    return base[index % base.length];
  });
}

export function colorByCode(code: number): FiberColor {
  return ALL_FIBER_COLORS[((code % 24) + 24) % 24];
}

/** Позиция внутри модуля (1..12) -> код цвета по выбранной цветовке. */
export function colorCodeForPosition(position: number, scheme = "TIA598"): number {
  const order = schemeOrder(scheme);
  return order[(position - 1) % order.length];
}

export function colorName(code: number): string {
  return colorByCode(code).name;
}

/** Подпись цвета жилы: для 13–24 добавляется «с полосой». */
export function colorLabel(code: number): string {
  const color = colorByCode(code);
  return color.striped ? `${color.name} (${color.short.toLowerCase()})` : color.name.toLowerCase();
}

/** «Кабель / модуль 2 / волокно 5 (зелёный)» — единый формат подписи волокна. */
export function fiberLabel(input: {
  cableLabel: string;
  moduleIndex: number;
  position: number;
  colorCode: number;
}): string {
  return `${input.cableLabel} · М${input.moduleIndex} · В${input.position} (${colorLabel(
    input.colorCode,
  )})`;
}
