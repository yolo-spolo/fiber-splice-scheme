import { describe, expect, it } from "vitest";
import {
  buildFibers,
  cableLayout,
  isModuleCapacity,
  layoutOptions,
  MODULE_CAPACITIES,
  plural,
} from "./cable-layout";

describe("layoutOptions", () => {
  it("для 16 волокон даёт 1×16 и 4×4", () => {
    const options = layoutOptions(16).map((o) => `${o.moduleCount}×${o.moduleCapacity}`);
    expect(options).toContain("1×16");
    expect(options).toContain("4×4");
    expect(options).toContain("2×8");
  });

  it("не предлагает раскладки с пустыми модулями", () => {
    for (const option of layoutOptions(16)) {
      expect(option.moduleCount * option.moduleCapacity).toBeGreaterThanOrEqual(16);
      expect((option.moduleCount - 1) * option.moduleCapacity).toBeLessThan(16);
    }
  });

  it("для 24 волокон первый вариант — 2×12", () => {
    expect(layoutOptions(24)[0]).toEqual({ moduleCount: 2, moduleCapacity: 12 });
  });

  it("всегда покрывает всё количество", () => {
    for (const total of [1, 6, 8, 12, 16, 24, 48, 96]) {
      const options = layoutOptions(total);
      expect(options.length).toBeGreaterThan(0);
      expect(options[0].moduleCount * options[0].moduleCapacity).toBeGreaterThanOrEqual(total);
    }
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

  it("считает раскладку для модуля на 16", () => {
    const layout = cableLayout(32, 2, 16);
    expect(layout.moduleCount).toBe(2);
    expect(layout.capacity).toBe(32);
    expect(layout.freeSlots).toBe(0);
    expect(layout.fits).toBe(true);
  });
});

describe("cableLayout", () => {
  it("делит ровно", () => {
    const layout = cableLayout(24, 2, 12);
    expect(layout.moduleCount).toBe(2);
    expect(layout.capacity).toBe(24);
    expect(layout.freeSlots).toBe(0);
    expect(layout.fits).toBe(true);
    expect(layout.summary).toBe("2 модуля × 12 = 24 места");
  });

  it("показывает неполный последний модуль", () => {
    const layout = cableLayout(8, 1, 12);
    expect(layout.moduleCount).toBe(1);
    expect(layout.capacity).toBe(12);
    expect(layout.remainder).toBe(8);
    expect(layout.freeSlots).toBe(4);
    expect(layout.emptyModules).toBe(0);
  });

  it("сочетает полные модули и остаток", () => {
    const layout = cableLayout(26, 3, 12);
    expect(layout.moduleCount).toBe(3);
    expect(layout.fullModules).toBe(2);
    expect(layout.remainder).toBe(2);
    expect(layout.freeSlots).toBe(10);
    expect(layout.fits).toBe(true);
  });

  it("предупреждает о пустых модулях", () => {
    const layout = cableLayout(8, 3, 12);
    expect(layout.emptyModules).toBe(2);
    expect(layout.freeSlots).toBe(28);
  });

  it("ловит нехватку места", () => {
    const layout = cableLayout(30, 2, 12);
    expect(layout.fits).toBe(false);
    expect(layout.overflow).toBe(6);
  });

  it("не делит на ноль", () => {
    const layout = cableLayout(10, 1, 0);
    expect(layout.moduleCapacity).toBe(12);
    expect(layout.fits).toBe(true);
  });
});

describe("buildFibers", () => {
  it("нумерует модули и позиции подряд", () => {
    const fibers = buildFibers(14, 12);
    expect(fibers).toHaveLength(14);
    expect(fibers[0]).toEqual({ moduleIndex: 1, position: 1, colorCode: 0 });
    expect(fibers[11]).toEqual({ moduleIndex: 1, position: 12, colorCode: 11 });
    expect(fibers[12]).toEqual({ moduleIndex: 2, position: 1, colorCode: 0 });
    expect(fibers[13]).toEqual({ moduleIndex: 2, position: 2, colorCode: 1 });
  });

  it("циклически повторяет цвета TIA-598", () => {
    const fibers = buildFibers(26, 12);
    expect(fibers[12].colorCode).toBe(fibers[0].colorCode);
    expect(fibers[24].colorCode).toBe(fibers[0].colorCode);
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
