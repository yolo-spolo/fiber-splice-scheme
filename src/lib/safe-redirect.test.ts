import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("пропускает собственные пути", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("/closures/abc/splice")).toBe("/closures/abc/splice");
    expect(safeNextPath("/login?next=%2Fx")).toBe("/login?next=%2Fx");
  });

  it("закрывает протокол-относительный редирект", () => {
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
  });

  it("отбрасывает абсолютные адреса и мусор", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });

  it("не пропускает управляющие символы", () => {
    expect(safeNextPath("/a\nb")).toBe("/");
  });
});
