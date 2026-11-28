import { describe, expect, it } from "vitest";
import { describeChanges, unrepeatedChanges } from "./history-diff";

describe("describeChanges", () => {
  it("показывает статус муфты словами, а не кодами", () => {
    expect(describeChanges({ status: "DONE" }, { status: "IN_PROGRESS" })).toEqual([
      { field: "status", label: "статус", before: "Сдана", after: "В работе" },
    ]);
  });

  it("называет цвет волокна, а не его номер", () => {
    const [change] = describeChanges({ colorCode: 3 }, { colorCode: 6 });
    expect(change.before).toBe("Коричневый");
    expect(change.after).toBe("Красный");
  });

  it("не выводит неизменившиеся поля", () => {
    const changes = describeChanges(
      { label: "К1", notes: "старое" },
      { label: "К1", notes: "новое" },
    );
    expect(changes.map((c) => c.field)).toEqual(["notes"]);
  });

  it("пустое значение показывает прочерком, а не null", () => {
    const [change] = describeChanges({ notes: "что-то" }, { notes: null });
    expect(change.after).toBe("—");
  });

  it("массив меток на фото сворачивает в количество", () => {
    const pins = [{ x: 0.1, y: 0.2, refType: "cassette", refId: "c1", label: "К1" }];
    const [change] = describeChanges({ pins: [] }, { pins });
    expect(change.before).toBe("нет");
    expect(change.after).toBe("1 шт.");
  });

  it("скрывает служебный targetId: это адрес записи, а не её содержимое", () => {
    const changes = describeChanges(
      { targetId: "c1", lossDb: 0.2 },
      { targetId: "c1", lossDb: 0.35 },
    );
    expect(changes.map((c) => c.field)).toEqual(["lossDb"]);
    expect(changes[0].after).toBe("0.35 дБ");
  });

  it("неизвестное поле не выводит: лучше меньше, чем внутренности записи", () => {
    expect(describeChanges({ secret: 1 }, { secret: 2 })).toEqual([]);
  });

  it("у создания нет «было» — показывать нечего, и это не ошибка", () => {
    expect(describeChanges(undefined, { label: "К1" })).toEqual([
      { field: "label", label: "подпись", before: "—", after: "К1" },
    ]);
  });

  it("координаты печатает без хвоста нулей", () => {
    const [change] = describeChanges({ lat: 44.95398 }, { lat: 44.954 });
    expect(change.after).toBe("44.954");
  });

  it("принадлежность кабеля переводит на русский", () => {
    const [change] = describeChanges({ ownership: "OURS" }, { ownership: "FOREIGN" });
    expect(change.after).toBe("чужой / транзитный");
  });
});

describe("unrepeatedChanges", () => {
  it("не повторяет то, что уже сказано в подписи события", () => {
    const changes = [
      { field: "status", label: "статус", before: "Сдана", after: "В работе" },
    ];
    expect(unrepeatedChanges("Сдана → В работе", changes)).toEqual([]);
  });

  it("не повторяет переименование кабеля: в подписи уже «К1 → К2»", () => {
    const changes = [
      { field: "label", label: "подпись", before: "К1", after: "К2" },
    ];
    expect(unrepeatedChanges("К1 → К2", changes)).toEqual([]);
  });

  it("оставляет поле, о котором подпись молчит", () => {
    const changes = [
      { field: "notes", label: "заметки", before: "старое", after: "новое" },
    ];
    expect(unrepeatedChanges("К1, заметки", changes)).toHaveLength(1);
  });
});
