import { describe, expect, it } from "vitest";
import { validateClosure, type ValidatorFiber, type ValidatorSplice } from "./validate";

function fiber(
  id: string,
  position: number,
  status: ValidatorFiber["status"] = "FREE",
  cableId = "c1",
): ValidatorFiber {
  return {
    id,
    cableId,
    cableLabel: cableId === "c1" ? "К1" : "К2",
    moduleIndex: 1,
    position,
    colorCode: (position - 1) % 12,
    status,
  };
}

/** Пара волокон из разных кабелей на одной позиции — типовая сварка. */
function pair(position: number, status: ValidatorFiber["status"] = "SPLICED") {
  return [fiber(`a${position}`, position, status, "c1"), fiber(`b${position}`, position, status, "c2")];
}

function splice(id: string, a: string, b: string, extra: Partial<ValidatorSplice> = {}): ValidatorSplice {
  return { id, fiberAId: a, fiberBId: b, cassetteId: "k1", kind: "FUSION", lossDb: null, ...extra };
}

const cassettes = [{ id: "k1", number: 1, capacity: 12 }];

describe("validateClosure", () => {
  it("чистая схема не даёт замечаний", () => {
    const issues = validateClosure({
      fibers: pair(1),
      splices: [splice("s1", "a1", "b1")],
      cassettes,
    });
    expect(issues).toEqual([]);
  });

  it("ловит двойную сварку волокна", () => {
    const issues = validateClosure({
      fibers: [...pair(1), fiber("c", 2, "SPLICED", "c2")],
      splices: [splice("s1", "a1", "b1"), splice("s2", "a1", "c")],
      cassettes,
    });
    expect(issues.filter((i) => i.code === "DOUBLE_SPLICE")).toHaveLength(1);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(1);
  });

  it("ловит сварку волокна с самим собой", () => {
    const issues = validateClosure({
      fibers: [fiber("a", 1)],
      splices: [splice("s1", "a", "a")],
      cassettes,
    });
    expect(issues.some((i) => i.code === "SELF_SPLICE")).toBe(true);
  });

  it("предупреждает о затухании выше нормы", () => {
    const issues = validateClosure({
      fibers: pair(1),
      splices: [splice("s1", "a1", "b1", { lossDb: 1.2 })],
      cassettes,
      maxLossDb: 0.5,
    });
    const loss = issues.find((i) => i.code === "HIGH_LOSS");
    expect(loss?.level).toBe("warning");
  });

  it("ловит переполнение кассеты", () => {
    const many: ValidatorSplice[] = [];
    const fibers: ValidatorFiber[] = [];
    for (let i = 0; i < 7; i += 1) {
      fibers.push(...pair(i + 1));
      many.push(splice(`s${i}`, `a${i}`, `b${i}`));
    }
    const issues = validateClosure({
      fibers,
      splices: many,
      cassettes: [{ id: "k1", number: 1, capacity: 6 }],
    });
    expect(issues.some((i) => i.code === "CASSETTE_OVERFLOW")).toBe(true);
  });

  it("ловит дубль адреса волокна", () => {
    const issues = validateClosure({
      fibers: [fiber("a", 1, "FREE", "c1"), fiber("b", 1, "FREE", "c1")],
      splices: [],
      cassettes,
    });
    expect(issues.some((i) => i.code === "DUPLICATE_FIBER")).toBe(true);
  });

  it("предупреждает о статусе без сварки", () => {
    const issues = validateClosure({
      fibers: [fiber("a1", 1, "SPLICED")],
      splices: [],
      cassettes,
    });
    expect(issues.some((i) => i.code === "STATUS_WITHOUT_SPLICE")).toBe(true);
  });
});
