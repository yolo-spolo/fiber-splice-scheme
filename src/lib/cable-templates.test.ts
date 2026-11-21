import { describe, expect, it } from "vitest";
import { cableLayout } from "./cable-layout";
import {
  CABLE_STANDARDS,
  CABLE_TEMPLATES,
  cableTemplatePresets,
  templateCapacity,
  templateName,
} from "./cable-templates";

describe("CABLE_TEMPLATES", () => {
  it("содержит семь раскладок из задачи", () => {
    const layouts = CABLE_TEMPLATES.map((t) => `${t.fiberCount}:${t.moduleCount}`);
    expect(layouts).toEqual(["1:1", "2:1", "4:1", "8:1", "16:2", "16:4", "48:6"]);
  });

  it("не предлагает модуль на 16 волокон", () => {
    for (const template of CABLE_TEMPLATES) {
      expect(templateCapacity(template)).toBeLessThanOrEqual(12);
    }
  });

  it("ёмкость совпадает с той, что посчитает форма", () => {
    expect(templateCapacity(CABLE_TEMPLATES[0])).toBe(1);
    expect(templateCapacity(CABLE_TEMPLATES[4])).toBe(8); // 16 в 2 модулях
    expect(templateCapacity(CABLE_TEMPLATES[5])).toBe(4); // 16 в 4 модулях
    expect(templateCapacity(CABLE_TEMPLATES[6])).toBe(8); // 48 в 6 модулях
  });

  it("одномодульные шаблоны получают белую трубку", () => {
    for (const template of CABLE_TEMPLATES.filter((t) => t.moduleCount === 1)) {
      expect(template.moduleColors).toEqual([5]);
    }
    for (const template of CABLE_TEMPLATES.filter((t) => t.moduleCount > 1)) {
      expect(template.moduleColors).toEqual([]);
    }
  });

  it("каждый шаблон помещается без пустых модулей", () => {
    for (const template of CABLE_TEMPLATES) {
      const layout = cableLayout(template.fiberCount, template.moduleCount);
      expect(layout.fits).toBe(true);
      expect(layout.emptyModules).toBe(0);
      expect(layout.freeSlots).toBe(0);
    }
  });
});

describe("cableTemplatePresets", () => {
  it("даёт по типу на каждую пару «раскладка × стандарт»", () => {
    const presets = cableTemplatePresets();
    expect(presets).toHaveLength(CABLE_TEMPLATES.length * CABLE_STANDARDS.length);
    expect(new Set(presets.map((p) => p.name)).size).toBe(presets.length);
  });

  it("называет типы понятно и без технических кодов", () => {
    const names = cableTemplatePresets().map((p) => p.name);
    expect(names).toContain("16 волокон · 2 × 8 (ГОСТ)");
    expect(names).toContain("48 волокон · 6 × 8 (Европа)");
    expect(names).toContain("1 волокно (ГОСТ)");
  });

  it("хранит посчитанную ёмкость и выбранную цветовку", () => {
    for (const preset of cableTemplatePresets()) {
      expect(preset.moduleCapacity).toBe(
        cableLayout(preset.fiberCount, preset.moduleCount).moduleCapacity,
      );
      expect(CABLE_STANDARDS.map((s) => s.value)).toContain(preset.colorScheme);
    }
  });
});

describe("templateName", () => {
  it("не повторяет раскладку для одного модуля", () => {
    expect(templateName(CABLE_TEMPLATES[0], "TIA598")).toBe("1 волокно (ГОСТ)");
    expect(templateName(CABLE_TEMPLATES[3], "DIN")).toBe("8 волокон (Европа)");
  });
});
