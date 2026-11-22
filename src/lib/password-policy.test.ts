import { describe, expect, it } from "vitest";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from "./password-policy";

describe("validatePassword", () => {
  it("принимает пароль ровно из 8 символов", () => {
    expect(validatePassword("12345678").ok).toBe(true);
  });

  it("отклоняет 7 символов", () => {
    const result = validatePassword("1234567");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("8");
  });

  it("не требует спецсимволов и заглавных букв", () => {
    expect(validatePassword("пароль12").ok).toBe(true);
    expect(validatePassword("aaaaaaaa").ok).toBe(true);
  });

  it("сохраняет пробелы внутри и по краям", () => {
    // Пароль не триммится: пробел — такой же символ, как остальные.
    expect(validatePassword(" pass word ").ok).toBe(true);
  });

  it("отклоняет строку из одних пробелов", () => {
    expect(validatePassword("        ").ok).toBe(false);
  });

  it("отклоняет слишком длинный пароль", () => {
    expect(validatePassword("a".repeat(PASSWORD_MAX_LENGTH + 1)).ok).toBe(false);
  });

  it("публикует минимум 8 символов", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
