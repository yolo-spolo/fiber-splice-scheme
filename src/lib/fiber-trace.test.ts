import { describe, expect, it } from "vitest";
import { cableExit, fiberAddress, traceFiber, type TraceData } from "./fiber-trace";

/**
 * Маршрут абонента через три муфты — так, как это лежит в базе.
 *
 * Каждый кабель записан в каждой муфте своей записью со своими волокнами:
 * «Магистраль» есть и в муфте 1, и в муфте 2, «Абонент» — и в муфте 2, и в
 * муфте 3. Свет идёт: ввод → сварка на магистраль → магистраль в соседнюю
 * муфту → сварка на абонентский кабель → он уходит в третью муфту и кончается
 * свободным волокном с подписью.
 */
function chain(): TraceData {
  const closure = (id: string, number: string, street: string) => ({
    id,
    number,
    kind: "МУФТА",
    city: "Симферополь",
    street,
    house: "1",
  });
  const fiber = (
    id: string,
    cableId: string,
    position: number,
    status: string,
    label: string | null = null,
  ) => ({ id, cableId, moduleIndex: 1, position, status, label });

  return {
    closures: [closure("m1", "1", "А"), closure("m2", "2", "Б"), closure("m3", "3", "В")],
    cables: [
      // Ввод: кабель приходит из-за пределов схемы, второй конец не задан.
      {
        id: "c0",
        label: "Ввод",
        closureId: "m1",
        fromClosureId: null,
        toClosureId: null,
        fromLocation: "ОРШ-3",
        toLocation: null,
      },
      // Магистраль между муфтами 1 и 2: две записи, по одной на конец.
      {
        id: "c1",
        label: "Магистраль",
        closureId: "m1",
        fromClosureId: null,
        toClosureId: "m2",
        fromLocation: null,
        toLocation: "Муфта 2",
      },
      {
        id: "c1b",
        label: "Магистраль",
        closureId: "m2",
        fromClosureId: "m1",
        toClosureId: null,
        fromLocation: "Муфта 1",
        toLocation: null,
      },
      // Абонентский кабель между муфтами 2 и 3.
      {
        id: "c2",
        label: "Абонент",
        closureId: "m2",
        fromClosureId: "m2",
        toClosureId: "m3",
        fromLocation: "Муфта 2",
        toLocation: "Муфта 3",
      },
      {
        id: "c2b",
        label: "Абонент",
        closureId: "m3",
        fromClosureId: "m2",
        toClosureId: null,
        fromLocation: "Муфта 2",
        toLocation: "Абонент 14",
      },
    ],
    fibers: [
      fiber("f0", "c0", 5, "SPLICED"),
      fiber("f1", "c1", 5, "SPLICED"),
      fiber("f1b", "c1b", 5, "SPLICED"),
      fiber("f2", "c2", 2, "SPLICED"),
      fiber("f2b", "c2b", 2, "FREE", "Абонент 14"),
    ],
    splices: [
      { closureId: "m1", fiberAId: "f0", fiberBId: "f1", lossDb: null },
      { closureId: "m2", fiberAId: "f1b", fiberBId: "f2", lossDb: 0.21 },
    ],
  };
}

describe("fiberAddress", () => {
  it("называет волокно как в схеме", () => {
    expect(fiberAddress({ moduleIndex: 2, position: 11 })).toBe("М2 В11");
  });
});

describe("cableExit", () => {
  const cable = {
    id: "c",
    label: "К1",
    closureId: "m1",
    fromClosureId: "m1",
    toClosureId: "m2",
    fromLocation: "Муфта 1",
    toLocation: "Муфта 2",
  };

  it("из муфты «откуда» ведёт в «куда»", () => {
    expect(cableExit(cable, "m1")).toEqual({ closureId: "m2", location: "Муфта 2" });
  });

  it("из муфты «куда» ведёт обратно в «откуда»", () => {
    expect(cableExit(cable, "m2")).toEqual({ closureId: "m1", location: "Муфта 1" });
  });

  it("вводной кабель без концов никуда не ведёт", () => {
    expect(cableExit({ ...cable, fromClosureId: null, toClosureId: null }, "m1")).toBeNull();
  });

  it("транзитный кабель с двумя чужими концами идёт не туда, откуда пришли", () => {
    const transit = { ...cable, closureId: "m2", fromClosureId: "m1", toClosureId: "m3" };
    expect(cableExit(transit, "m2", "m1")).toEqual({ closureId: "m3", location: "Муфта 2" });
  });

  it("транзитный кабель без указания стороны не угадывается", () => {
    const transit = { ...cable, closureId: "m2", fromClosureId: "m1", toClosureId: "m3" };
    expect(cableExit(transit, "m2")).toBeNull();
  });
});

describe("traceFiber", () => {
  it("проходит весь путь через три муфты", () => {
    const trace = traceFiber(chain(), "f1");
    expect(trace).not.toBeNull();
    // Абонент → муфта 3 → муфта 2 → муфта 1, где кабель-ввод уходит за схему.
    expect(trace!.steps.map((s) => s.closure.number)).toEqual(["3", "2", "2", "1", "1"]);
  });

  it("показывает сварку с потерями: именно её ищут при разборе", () => {
    const trace = traceFiber(chain(), "f1");
    const middle = trace!.steps.find((s) => s.fiber.id === "f2");
    expect(middle?.splice?.with.id).toBe("f1b");
    expect(middle?.splice?.withCable.label).toBe("Магистраль");
    expect(middle?.splice?.lossDb).toBe(0.21);
  });

  it("называет конец маршрута по подписи волокна", () => {
    const trace = traceFiber(chain(), "f1");
    expect(trace!.startStop).toEqual({ kind: "end", reason: "Конец маршрута: Абонент 14" });
  });

  it("объясняет обрыв на вводном кабеле без второго конца", () => {
    const trace = traceFiber(chain(), "f1");
    expect(trace!.endStop.kind === "end" && trace!.endStop.reason).toContain("Ввод");
    expect(trace!.endStop.kind === "end" && trace!.endStop.reason).toContain(
      "не имеет второго конца",
    );
  });

  it("соединяет шаги переходами: кабель между муфтами, сварка внутри", () => {
    const trace = traceFiber(chain(), "f1");
    expect(trace!.steps.map((s) => s.link)).toEqual(["cable", "splice", "cable", "splice", null]);
  });

  it("повреждённое волокно называет повреждённым", () => {
    const data = chain();
    data.fibers[4].status = "DAMAGED";
    const trace = traceFiber(data, "f1");
    expect(trace!.startStop.kind === "end" && trace!.startStop.reason).toContain("повреждено");
  });

  it("без сварок маршрут — сам кабель в двух муфтах, и это не ошибка", () => {
    const data = chain();
    data.splices = [];
    const trace = traceFiber(data, "f1");
    // Жила в муфте 1 и та же жила в муфте 2: один кабель, сварок нет.
    expect(trace!.steps.map((s) => s.closure.number)).toEqual(["2", "1"]);
    expect(trace!.steps.every((s) => s.splice === null)).toBe(true);
    expect(trace!.steps.map((s) => s.link)).toEqual(["cable", null]);
  });

  it("несуществующее волокно не роняет страницу", () => {
    expect(traceFiber(chain(), "нет-такого")).toBeNull();
  });

  it("не угадывает, когда в соседней муфте два одинаковых кабеля", () => {
    const data = chain();
    data.cables.push({
      id: "c2-dup",
      label: "Абонент",
      closureId: "m3",
      fromClosureId: "m2",
      toClosureId: null,
      fromLocation: null,
      toLocation: null,
    });
    const trace = traceFiber(data, "f1");
    // Маршрут остаётся, но обрыв объяснён, а не выдан за нормальный конец.
    expect(trace!.startStop.kind).toBe("end");
    expect(trace!.steps.length).toBeLessThanOrEqual(4);
  });

  it("не крутит маршрут по кругу", () => {
    const data = chain();
    data.cables.find((c) => c.id === "c2b")!.toClosureId = "m1";
    data.cables.find((c) => c.id === "c2b")!.fromClosureId = "m2";
    data.fibers.push({
      id: "fback",
      cableId: "c1",
      moduleIndex: 1,
      position: 2,
      status: "SPLICED",
      label: null,
    });
    data.splices.push({ closureId: "m1", fiberAId: "f1", fiberBId: "fback", lossDb: null });
    const trace = traceFiber(data, "f1");
    expect(trace!.steps.length).toBeLessThanOrEqual(60);
    expect(["loop", "broken", "end"]).toContain(trace!.startStop.kind);
  });
});
