import { describe, expect, it } from "vitest";
import { actionLabel, actorLabel, HISTORY_ACTIONS, RESTORABLE } from "./history-labels";

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
