import { describe, expect, it } from "vitest";
import { initialMode, isGuestPath, isThemeMode, resolveTheme } from "./theme";

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

describe("initialMode", () => {
  it("гость в новом браузере видит светлую тему", () => {
    expect(initialMode(null, true)).toBe("light");
  });

  it("исполнитель по умолчанию следует системе", () => {
    expect(initialMode(null, false)).toBe("system");
  });

  it("выбор гостя важнее умолчания", () => {
    expect(initialMode("dark", true)).toBe("dark");
    expect(initialMode("system", true)).toBe("system");
  });

  it("мусор в хранилище не ломает старт", () => {
    expect(initialMode("", true)).toBe("light");
    expect(initialMode("DARK", false)).toBe("system");
  });
});

describe("isGuestPath", () => {
  it("ссылки заказчика живут под /s/", () => {
    expect(isGuestPath("/s/abc")).toBe(true);
    expect(isGuestPath("/s/abc/closure/cm1")).toBe(true);
    expect(isGuestPath("/s")).toBe(true);
  });

  it("интерфейс исполнителя — не гостевая страница", () => {
    expect(isGuestPath("/")).toBe(false);
    expect(isGuestPath("/closures/cm1")).toBe(false);
    expect(isGuestPath("/settings")).toBe(false);
    expect(isGuestPath("/sitemap")).toBe(false);
  });
});
