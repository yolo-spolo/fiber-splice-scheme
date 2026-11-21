import { describe, expect, it } from "vitest";
import {
  colorByCode,
  colorsForScheme,
  COLOR_SCHEMES,
  FIBER_COLORS,
  FIBER_COLORS_STRIPED,
  isColorScheme,
  moduleColorCode,
  moduleColorCodes,
  schemeOrder,
} from "./colors";

describe("цветовка", () => {
  it("стандартная схема идёт по порядку TIA-598", () => {
    expect(colorsForScheme("TIA598", 12)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("европейская схема начинается с красного", () => {
    const palette = colorsForScheme("DIN", 12);
    expect(colorByCode(palette[0]).name).toBe("Красный");
    expect(palette).toHaveLength(12);
    expect(new Set(palette).size).toBe(12);
  });

  it("все белые дают одинаковый цвет", () => {
    expect(colorsForScheme("ALL_WHITE", 8)).toEqual([5, 5, 5, 5, 5, 5, 5, 5]);
  });

  it("свой порядок берётся из массива", () => {
    const custom = [6, 2, 0, 6, 2, 0];
    expect(colorsForScheme("CUSTOM", 6, custom)).toEqual(custom);
  });

  it("свой порядок без массива откатывается к стандарту", () => {
    expect(colorsForScheme("CUSTOM", 4, [])).toEqual([0, 1, 2, 3]);
  });

  it("неизвестная схема трактуется как стандарт", () => {
    expect(colorsForScheme("НЕТ-ТАКОЙ", 3)).toEqual([0, 1, 2]);
    expect(schemeOrder("НЕТ-ТАКОЙ")).toEqual(COLOR_SCHEMES[0].order);
  });

  it("поддерживает вторую дюжину с полосой", () => {
    expect(FIBER_COLORS_STRIPED).toHaveLength(12);
    expect(colorByCode(12).name).toBe("Синий с полосой");
    expect(colorByCode(12).striped).toBe(true);
    expect(colorByCode(23).name).toBe("Бирюзовый с полосой");
    expect(colorByCode(0).striped).toBeUndefined();
  });

  it("код цвета зациклен на 24", () => {
    expect(colorByCode(24).code).toBe(0);
    expect(colorByCode(-1).code).toBe(23);
  });

  it("все схемы содержат по 12 цветов", () => {
    for (const scheme of COLOR_SCHEMES) {
      expect(scheme.order).toHaveLength(12);
    }
  });

  it("распознаёт допустимые схемы", () => {
    expect(isColorScheme("TIA598")).toBe(true);
    expect(isColorScheme("DIN")).toBe(true);
    expect(isColorScheme("CUSTOM")).toBe(true);
    expect(isColorScheme("XXX")).toBe(false);
  });

  it("базовая палитра содержит 12 цветов", () => {
    expect(FIBER_COLORS).toHaveLength(12);
  });
});

describe("цвета модулей", () => {
  it("идёт по порядку стандарта", () => {
    expect(moduleColorCodes(4)).toEqual([0, 1, 2, 3]);
    expect(colorByCode(moduleColorCode(2)).name).toBe("Оранжевый");
  });

  it("после дюжины берёт цвета с полосой", () => {
    const codes = moduleColorCodes(14);
    expect(codes[11]).toBe(11);
    expect(codes[12]).toBe(12);
    expect(colorByCode(codes[12]).striped).toBe(true);
  });

  it("уважает ручной цвет модуля", () => {
    expect(moduleColorCodes(3, "TIA598", [6, -1, -1])).toEqual([6, 1, 2]);
  });

  it("«все белые» не делает трубки белыми", () => {
    expect(moduleColorCodes(3, "ALL_WHITE")).toEqual([0, 1, 2]);
  });

  it("пустой кабель не даёт цветов", () => {
    expect(moduleColorCodes(0)).toEqual([]);
  });
});
