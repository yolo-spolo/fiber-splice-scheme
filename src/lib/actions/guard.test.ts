import { describe, expect, it, vi } from "vitest";

/**
 * Порядок в guard.ts — это правило безопасности, а не стиль: если запись
 * читается раньше проверки прав, посторонний по ответу «не найдено» узнаёт,
 * что она существует. Проверяем сам порядок вызовов.
 */
const calls: string[] = [];

vi.mock("@/lib/edit-access", () => ({
  EDIT_FORBIDDEN: "нет доступа",
  resolveActor: async (token: string | null | undefined) => {
    calls.push("actor");
    if (!token) return { error: "нужно войти" };
    return { actor: { kind: "guest", name: "Гость", shareId: "s1", link: {} } };
  },
  actorCanEditClosure: async (_actor: unknown, closureId: string) => {
    calls.push(`canEdit:${closureId}`);
    return closureId === "allowed";
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      calls.push("transaction");
      await fn({});
    },
  },
}));

vi.mock("@/lib/history", () => ({
  logHistory: async () => {
    calls.push("history");
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    calls.push(`revalidate:${path}`);
  },
}));

const { editClosureRecord } = await import("./guard");

function reset() {
  calls.length = 0;
}

const base = {
  shareToken: "token",
  notFound: "Запись не найдена",
  write: async () => {
    calls.push("write");
    return { action: "cassetteUpdate" as const, summary: "тест" };
  },
};

describe("editClosureRecord", () => {
  it("проверяет, кто действует, раньше чтения записи", async () => {
    reset();
    await editClosureRecord({
      ...base,
      scope: async () => {
        calls.push("scope");
        return { closureId: "allowed", row: {} };
      },
    });
    expect(calls.slice(0, 3)).toEqual(["actor", "scope", "canEdit:allowed"]);
  });

  it("не пишет и не логирует, если ссылка не пускает к муфте", async () => {
    reset();
    const result = await editClosureRecord({
      ...base,
      scope: async () => {
        calls.push("scope");
        return { closureId: "foreign", row: {} };
      },
    });
    expect(result).toEqual({ error: "нет доступа" });
    expect(calls).not.toContain("transaction");
    expect(calls).not.toContain("write");
    expect(calls).not.toContain("history");
  });

  it("гостю не сообщает, существует ли запись", async () => {
    reset();
    const result = await editClosureRecord({ ...base, scope: async () => null });
    expect(result).toEqual({ error: "нет доступа" });
  });

  it("изменение и запись истории идут одной транзакцией", async () => {
    reset();
    await editClosureRecord({
      ...base,
      scope: async () => ({ closureId: "allowed", row: {} }),
    });
    const transactionAt = calls.indexOf("transaction");
    expect(transactionAt).toBeGreaterThan(-1);
    expect(calls.indexOf("write")).toBeGreaterThan(transactionAt);
    expect(calls.indexOf("history")).toBeGreaterThan(transactionAt);
  });

  it("пересчитывает страницу муфты после успеха", async () => {
    reset();
    await editClosureRecord({
      ...base,
      scope: async () => ({ closureId: "allowed", row: {} }),
    });
    expect(calls).toContain("revalidate:/closures/allowed");
  });

  it("без записи истории транзакция всё равно применяет изменение", async () => {
    reset();
    const result = await editClosureRecord({
      ...base,
      scope: async () => ({ closureId: "allowed", row: {} }),
      write: async () => {
        calls.push("write");
        return null;
      },
    });
    expect(result).toEqual({ ok: true });
    expect(calls).toContain("write");
    expect(calls).not.toContain("history");
  });

  it("без токена и без сессии дальше не идёт", async () => {
    reset();
    const result = await editClosureRecord({
      ...base,
      shareToken: null,
      scope: async () => {
        calls.push("scope");
        return { closureId: "allowed", row: {} };
      },
    });
    expect(result).toEqual({ error: "нужно войти" });
    expect(calls).not.toContain("scope");
  });
});
