import { describe, expect, it } from "vitest";
import { resolveCableEndpoint, type ClosureOption } from "./cable-endpoints";

const options: ClosureOption[] = [
  {
    id: "c1",
    number: "1",
    kind: "МУФТА",
    city: "Симферополь",
    street: "Коцюбинского",
    house: "26А",
    projectId: "p1",
  },
  {
    id: "c2",
    number: "2",
    kind: "МУФТА",
    city: null,
    street: null,
    house: null,
    projectId: "p1",
  },
  { id: "x1", number: "9", kind: "КРОСС", city: null, street: null, house: null, projectId: "p2" },
];

describe("resolveCableEndpoint", () => {
  it("выбранная муфта даёт ссылку и текстовый снимок адреса", () => {
    expect(resolveCableEndpoint({ closureId: "c1" }, options, "p1")).toEqual({
      closureId: "c1",
      location: "г. Симферополь, ул. Коцюбинского, д. 26А",
    });
  });

  it("для муфты без адреса снимком становится её номер", () => {
    expect(resolveCableEndpoint({ closureId: "c2" }, options, "p1")).toEqual({
      closureId: "c2",
      location: "Муфта №2",
    });
  });

  it("свободный адрес остаётся текстом без ссылки", () => {
    expect(resolveCableEndpoint({ location: " Колодец К-14 " }, options, "p1")).toEqual({
      closureId: null,
      location: "Колодец К-14",
    });
  });

  it("пустой выбор — пустой конец кабеля", () => {
    expect(resolveCableEndpoint({ closureId: "", location: "  " }, options, "p1")).toEqual({
      closureId: null,
      location: null,
    });
  });

  it("муфта другого объекта отклоняется", () => {
    const result = resolveCableEndpoint({ closureId: "x1" }, options, "p1");
    expect("error" in result && result.error).toBe("Муфта относится к другому объекту");
  });

  it("несуществующая муфта отклоняется", () => {
    const result = resolveCableEndpoint({ closureId: "nope" }, options, "p1");
    expect("error" in result && result.error).toBe("Муфта не найдена на объекте");
  });

  it("выбранная муфта важнее введённого текста", () => {
    expect(
      resolveCableEndpoint({ closureId: "c1", location: "что-то своё" }, options, "p1"),
    ).toEqual({ closureId: "c1", location: "г. Симферополь, ул. Коцюбинского, д. 26А" });
  });
});
