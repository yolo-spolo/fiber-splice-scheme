import { describe, expect, it } from "vitest";
import {
  decodeGuestCookie,
  encodeGuestCookie,
  GUEST_NAME_MAX,
  guestCookieName,
  normalizeGuestName,
} from "./guest-name";

describe("normalizeGuestName", () => {
  it("схлопывает пробелы и обрезает края", () => {
    expect(normalizeGuestName("  Иван   Петров ")).toBe("Иван Петров");
  });

  it("не принимает пустое имя или одну букву", () => {
    expect(normalizeGuestName("")).toBeNull();
    expect(normalizeGuestName("   ")).toBeNull();
    expect(normalizeGuestName("И")).toBeNull();
    expect(normalizeGuestName(null)).toBeNull();
  });

  it("ограничивает длину", () => {
    const long = "Я".repeat(GUEST_NAME_MAX + 20);
    expect(normalizeGuestName(long)?.length).toBe(GUEST_NAME_MAX);
  });
});

describe("cookie имени", () => {
  it("кодирует и раскодирует кириллицу", () => {
    const name = "Монтажник Сергей";
    expect(decodeGuestCookie(encodeGuestCookie(name))).toBe(name);
  });

  it("переживает битую кодировку", () => {
    expect(decodeGuestCookie("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("у каждой ссылки своя cookie", () => {
    expect(guestCookieName("abc")).not.toBe(guestCookieName("def"));
    expect(guestCookieName("abc").startsWith("fiber_guest_")).toBe(true);
  });
});
