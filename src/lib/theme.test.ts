import { describe, expect, it } from "vitest";
import { isThemeMode, resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("явные режимы не зависят от системы", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("системный режим следует настройке ОС", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("isThemeMode", () => {
  it("пропускает только известные режимы", () => {
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(true);
  });

  it("отбрасывает мусор из localStorage", () => {
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode("DARK")).toBe(false);
    expect(isThemeMode(42)).toBe(false);
  });
});
