import { describe, expect, it } from "vitest";
import { editorFiber, photoPins, splicedFiberIds } from "./editor-data";

describe("editorFiber", () => {
  it("переносит подпись волокна — то поле, которое забывали добавить вручную", () => {
    const fiber = editorFiber({
      id: "f1",
      moduleIndex: 2,
      position: 7,
      colorCode: 3,
      label: "Абонент: кв. 42",
      status: "SPLICED",
    });
    expect(fiber.label).toBe("Абонент: кв. 42");
  });

  it("оставляет подпись пустой, если её нет", () => {
    const fiber = editorFiber({
      id: "f2",
      moduleIndex: 1,
      position: 1,
      colorCode: 0,
      label: null,
      status: "FREE",
    });
    expect(fiber.label).toBeNull();
  });

  it("не теряет адресацию волокна", () => {
    const fiber = editorFiber({
      id: "f3",
      moduleIndex: 5,
      position: 12,
      colorCode: 11,
      label: null,
      status: "TRANSIT",
    });
    expect([fiber.moduleIndex, fiber.position, fiber.colorCode, fiber.status]).toEqual([
      5, 12, 11, "TRANSIT",
    ]);
  });
});

describe("photoPins", () => {
  it("возвращает пустой список, если меток не было", () => {
    expect(photoPins(null)).toEqual([]);
    expect(photoPins(undefined)).toEqual([]);
    expect(photoPins({})).toEqual([]);
  });

  it("пропускает сохранённые метки", () => {
    const pins = [{ x: 0.5, y: 0.5, refType: "cassette", refId: "c1", label: "Кассета 1" }];
    expect(photoPins(pins)).toEqual(pins);
  });
});

describe("splicedFiberIds", () => {
  it("собирает обе стороны каждой сварки без повторов", () => {
    const closure = {
      splices: [
        { fiberAId: "a", fiberBId: "b" },
        { fiberAId: "b", fiberBId: "c" },
      ],
    } as unknown as Parameters<typeof splicedFiberIds>[0];
    expect(splicedFiberIds(closure).sort()).toEqual(["a", "b", "c"]);
  });

  it("без сварок список пуст", () => {
    expect(splicedFiberIds({ splices: [] } as never)).toEqual([]);
  });
});
