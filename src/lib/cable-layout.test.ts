import { describe, expect, it } from "vitest";
import {
  buildFibers,
  cableLayout,
  deriveModuleCapacity,
  isModuleCapacity,
  MODULE_CAPACITIES,
  plural,
  suggestModuleCount,
} from "./cable-layout";

describe("deriveModuleCapacity", () => {
  it("делит ровно: 24 волокна в 2 модулях — по 12", () => {
    expect(deriveModuleCapacity(24, 2)).toBe(12);
    expect(deriveModuleCapacity(16, 2)).toBe(8);
    expect(deriveModuleCapacity(48, 6)).toBe(8);
    expect(deriveModuleCapacity(16, 4)).toBe(4);
  });

  it("берёт наименьшую ёмкость, в которую помещается остаток", () => {
    // 14 в одном модуле — 16: двух свободных мест не избежать.
    expect(deriveModuleCapacity(14, 1)).toBe(16);
    // 9 в 2 модулях — по 5 не бывает, ближайшая ёмкость 6.
    expect(deriveModuleCapacity(9, 2)).toBe(6);
    expect(deriveModuleCapacity(7, 2)).toBe(4);
  });

  it("не выходит за 16 волокон на модуль", () => {
    // 24 волокна в одну трубку не помещаются: 16 — предел, раскладка
    // покажет нехватку, а не спрячет её.
    expect(deriveModuleCapacity(24, 1)).toBe(16);
    expect(deriveModuleCapacity(1152, 1)).toBe(16);
  });

  it("на пустых полях возвращает стандартные 12", () => {
    expect(deriveModuleCapacity(0, 1)).toBe(12);
    expect(deriveModuleCapacity(24, 0)).toBe(12);
  });
});

describe("MODULE_CAPACITIES", () => {
  it("содержит весь набор, включая 16", () => {
    expect([...MODULE_CAPACITIES]).toEqual([1, 2, 4, 6, 8, 10, 12, 16]);
  });

  it("распознаёт допустимые значения", () => {
    for (const value of [1, 2, 4, 6, 8, 10, 12, 16]) {
      expect(isModuleCapacity(value)).toBe(true);
    }
    for (const value of [0, 3, 5, 14, 24, 32]) {
      expect(isModuleCapacity(value)).toBe(false);
    }
  });
});

describe("suggestModuleCount", () => {
  it("считает модули по 12 волокон", () => {
    expect(suggestModuleCount(1)).toBe(1);
    expect(suggestModuleCount(12)).toBe(1);
    expect(suggestModuleCount(13)).toBe(2);
    expect(suggestModuleCount(24)).toBe(2);
    expect(suggestModuleCount(48)).toBe(4);
    expect(suggestModuleCount(96)).toBe(8);
  });
});

describe("cableLayout", () => {
  it("делит ровно", () => {
    const layout = cableLayout(24, 2);
    expect(layout.moduleCount).toBe(2);
    expect(layout.moduleCapacity).toBe(12);
    expect(layout.capacity).toBe(24);
    expect(layout.freeSlots).toBe(0);
    expect(layout.fits).toBe(true);
    expect(layout.summary).toBe("2 модуля × 12 = 24 места");
  });

  it("ровно заполненный модуль не оставляет свободных мест", () => {
    const layout = cableLayout(8, 1);
    expect(layout.moduleCapacity).toBe(8);
    expect(layout.capacity).toBe(8);
    // remainder = 0 значит «модуль полный»; предпросмотр подставляет ёмкость.
    expect(layout.remainder).toBe(0);
    expect(layout.freeSlots).toBe(0);
    expect(layout.emptyModules).toBe(0);
  });

  it("сочетает полные модули и остаток", () => {
    const layout = cableLayout(26, 3);
    expect(layout.moduleCapacity).toBe(10);
    expect(layout.capacity).toBe(30);
    expect(layout.fullModules).toBe(2);
    expect(layout.remainder).toBe(6);
    expect(layout.freeSlots).toBe(4);
    expect(layout.fits).toBe(true);
  });

  it("предупреждает о пустых модулях", () => {
    const layout = cableLayout(8, 3);
    expect(layout.moduleCapacity).toBe(4);
    expect(layout.filledModules).toBe(2);
    expect(layout.emptyModules).toBe(1);
  });

  it("ловит нехватку места, когда 16 волокон на модуль не хватает", () => {
    const layout = cableLayout(40, 2);
    expect(layout.moduleCapacity).toBe(16);
    expect(layout.capacity).toBe(32);
    expect(layout.fits).toBe(false);
    expect(layout.overflow).toBe(8);
  });
});

describe("buildFibers", () => {
  it("нумерует модули и позиции подряд", () => {
    // 14 волокон в 2 модулях — по 8.
    const fibers = buildFibers(14, 2);
    expect(fibers).toHaveLength(14);
    expect(fibers[0]).toEqual({ moduleIndex: 1, position: 1, colorCode: 0 });
    expect(fibers[7]).toEqual({ moduleIndex: 1, position: 8, colorCode: 7 });
    expect(fibers[8]).toEqual({ moduleIndex: 2, position: 1, colorCode: 0 });
    expect(fibers[13]).toEqual({ moduleIndex: 2, position: 6, colorCode: 5 });
  });

  it("раскладывает 26 волокон в 3 модуля по 10", () => {
    const fibers = buildFibers(26, 3);
    expect(fibers[9]).toEqual({ moduleIndex: 1, position: 10, colorCode: 9 });
    expect(fibers[10]).toEqual({ moduleIndex: 2, position: 1, colorCode: 0 });
    expect(fibers[20]).toEqual({ moduleIndex: 3, position: 1, colorCode: 0 });
  });

  it("циклически повторяет цвета TIA-598", () => {
    const fibers = buildFibers(24, 2);
    expect(fibers[12].colorCode).toBe(fibers[0].colorCode);
  });
});

describe("plural", () => {
  it("склоняет по-русски", () => {
    expect(plural(1, "модуль", "модуля", "модулей")).toBe("модуль");
    expect(plural(2, "модуль", "модуля", "модулей")).toBe("модуля");
    expect(plural(5, "модуль", "модуля", "модулей")).toBe("модулей");
    expect(plural(11, "модуль", "модуля", "модулей")).toBe("модулей");
    expect(plural(21, "модуль", "модуля", "модулей")).toBe("модуль");
  });
});
