import { describe, expect, it } from "vitest";
import {
  actionLabel,
  actorLabel,
  HISTORY_ACTIONS,
  RESTORABLE,
  toHistoryItem,
} from "./history-labels";

describe("actorLabel", () => {
  it("владельца подписывает без пометок", () => {
    expect(actorLabel({ actorKind: "OWNER", actorName: "Владелец" })).toBe("Владелец");
  });

  it("гостя помечает как правку по ссылке", () => {
    expect(actorLabel({ actorKind: "GUEST", actorName: "Сергей" })).toBe("Сергей (по ссылке)");
  });
});

describe("actionLabel", () => {
  it("переводит машинное имя в человеческое", () => {
    expect(actionLabel("cableCreate")).toBe("Добавлен кабель");
    expect(actionLabel("spliceDelete")).toBe("Удалена сварка");
  });

  it("неизвестное действие показывает как есть, а не прячет", () => {
    expect(actionLabel("futureAction")).toBe("futureAction");
  });
});

describe("RESTORABLE", () => {
  it("каждое возвращаемое действие указывает на существующий тип записи", () => {
    const allowed = new Set(["closure", "fiber", "splice", "cassette"]);
    for (const target of Object.values(RESTORABLE)) {
      expect(allowed.has(target as string)).toBe(true);
    }
  });

  it("создание и удаление не откатываются", () => {
    expect(RESTORABLE.cableCreate).toBeUndefined();
    expect(RESTORABLE.cableDelete).toBeUndefined();
    expect(RESTORABLE.spliceCreate).toBeUndefined();
    expect(RESTORABLE.spliceDelete).toBeUndefined();
  });

  it("все откатываемые действия есть в словаре", () => {
    for (const action of Object.keys(RESTORABLE)) {
      expect(HISTORY_ACTIONS).toHaveProperty(action);
    }
  });
});

describe("toHistoryItem", () => {
  const event = {
    id: "evt1",
    actorKind: "GUEST",
    actorName: "Сергей",
    action: "fiberLabel",
    summary: "М1 В1: без подписи → Абонент",
    createdAt: new Date("2026-11-26T09:05:00Z"),
  };

  it("переводит запись базы в вид списка", () => {
    const item = toHistoryItem(event);
    expect(item.actionLabel).toBe("Подпись волокна");
    expect(item.createdAt).toBe("2026-11-26T09:05:00.000Z");
    expect(item.restorable).toBe(true);
  });

  it("помечает неисправимое действие как неоткатываемое", () => {
    expect(toHistoryItem({ ...event, action: "cableDelete" }).restorable).toBe(false);
  });

  it("неизвестное действие не прячет, а показывает как есть", () => {
    expect(toHistoryItem({ ...event, action: "futureAction" }).actionLabel).toBe("futureAction");
  });

  it("доносит «было → стало» до списка", () => {
    const item = toHistoryItem({
      ...event,
      before: { label: null },
      after: { label: "Абонент" },
    });
    expect(item.changes).toEqual([
      { field: "label", label: "подпись", before: "—", after: "Абонент" },
    ]);
  });

  it("запись без снимков не ломает список", () => {
    expect(toHistoryItem(event).changes).toEqual([]);
  });
});
