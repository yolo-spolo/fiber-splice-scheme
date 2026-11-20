import { colorName } from "./colors";

export type IssueLevel = "error" | "warning";

export type ValidationIssue = {
  level: IssueLevel;
  code: string;
  message: string;
  spliceId?: string;
  fiberId?: string;
};

export type ValidatorFiber = {
  id: string;
  cableId: string;
  cableLabel: string;
  moduleIndex: number;
  position: number;
  colorCode: number;
  status: "FREE" | "SPLICED" | "TRANSIT" | "DAMAGED";
};

export type ValidatorSplice = {
  id: string;
  fiberAId: string;
  fiberBId: string;
  cassetteId: string | null;
  kind: "FUSION" | "MECHANICAL" | "PIGTAIL" | "SPLITTER" | "TRANSIT";
  lossDb: number | null;
};

export type ValidatorCassette = {
  id: string;
  number: number;
  capacity: number;
};

export type ValidatorInput = {
  fibers: ValidatorFiber[];
  splices: ValidatorSplice[];
  cassettes: ValidatorCassette[];
  maxLossDb?: number;
};

export function fiberRef(f: ValidatorFiber): string {
  return `${f.cableLabel} М${f.moduleIndex} В${f.position} (${colorName(f.colorCode).toLowerCase()})`;
}

/**
 * Правила схемы. Ошибки блокируют сдачу, предупреждения только подсвечивают.
 * Функция чистая — на ней же построены юнит-тесты.
 */
export function validateClosure(input: ValidatorInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const maxLoss = input.maxLossDb ?? 0.5;
  const fiberById = new Map(input.fibers.map((f) => [f.id, f]));

  const spliceCount = new Map<string, number>();
  for (const s of input.splices) {
    if (s.fiberAId === s.fiberBId) {
      issues.push({
        level: "error",
        code: "SELF_SPLICE",
        message: `Волокно сварено само с собой: ${describe(s.fiberAId)}`,
        spliceId: s.id,
        fiberId: s.fiberAId,
      });
    }
    for (const id of [s.fiberAId, s.fiberBId]) {
      spliceCount.set(id, (spliceCount.get(id) ?? 0) + 1);
    }
    if (s.lossDb != null && s.lossDb > maxLoss) {
      issues.push({
        level: "warning",
        code: "HIGH_LOSS",
        message: `Затухание ${s.lossDb.toFixed(2)} дБ выше нормы ${maxLoss} дБ: ${describe(
          s.fiberAId,
        )} ↔ ${describe(s.fiberBId)}`,
        spliceId: s.id,
      });
    }
  }

  for (const [fiberId, count] of spliceCount) {
    if (count > 1) {
      issues.push({
        level: "error",
        code: "DOUBLE_SPLICE",
        message: `Волокно участвует в ${count} сварках: ${describe(fiberId)}`,
        fiberId,
      });
    }
  }

  for (const f of input.fibers) {
    const count = spliceCount.get(f.id) ?? 0;
    if (f.status === "SPLICED" && count === 0) {
      issues.push({
        level: "warning",
        code: "STATUS_WITHOUT_SPLICE",
        message: `Отмечено «сварено», но сварки нет: ${fiberRef(f)}`,
        fiberId: f.id,
      });
    }
    if (f.status === "FREE" && count > 0) {
      issues.push({
        level: "warning",
        code: "FREE_WITH_SPLICE",
        message: `Есть сварка, но волокно помечено свободным: ${fiberRef(f)}`,
        fiberId: f.id,
      });
    }
  }

  const perCassette = new Map<string, number>();
  for (const s of input.splices) {
    if (!s.cassetteId) continue;
    perCassette.set(s.cassetteId, (perCassette.get(s.cassetteId) ?? 0) + 1);
  }
  for (const c of input.cassettes) {
    const used = perCassette.get(c.id) ?? 0;
    if (used > c.capacity) {
      issues.push({
        level: "error",
        code: "CASSETTE_OVERFLOW",
        message: `Кассета ${c.number}: ${used} сварок при ёмкости ${c.capacity}`,
      });
    }
  }

  const duplicated = new Map<string, ValidatorFiber[]>();
  for (const f of input.fibers) {
    const key = `${f.cableId}|${f.moduleIndex}|${f.position}`;
    duplicated.set(key, [...(duplicated.get(key) ?? []), f]);
  }
  for (const group of duplicated.values()) {
    if (group.length > 1) {
      issues.push({
        level: "error",
        code: "DUPLICATE_FIBER",
        message: `Дубль адреса волокна: ${fiberRef(group[0])}`,
        fiberId: group[0].id,
      });
    }
  }

  return issues;

  function describe(fiberId: string): string {
    const f = fiberById.get(fiberId);
    return f ? fiberRef(f) : "неизвестное волокно";
  }
}

export function summarize(issues: ValidationIssue[]) {
  return {
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
  };
}
