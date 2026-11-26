import { describe, expect, it } from "vitest";
import {
  closureTitle,
  formatCoordinates,
  formatLatLng,
  formatPostalAddress,
  parseCoordinates,
} from "./address";

describe("formatPostalAddress", () => {
  it("собирает полный адрес в привычном порядке", () => {
    expect(formatPostalAddress({ city: "Симферополь", street: "Коцюбинского", house: "26А" })).toBe(
      "г. Симферополь, ул. Коцюбинского, д. 26А",
    );
  });

  it("пропускает незаполненные части без лишних запятых", () => {
    expect(formatPostalAddress({ city: "Москва", street: null, house: "12" })).toBe(
      "г. Москва, д. 12",
    );
    expect(formatPostalAddress({ street: "Полярная" })).toBe("ул. Полярная");
  });

  it("возвращает null, если адреса нет", () => {
    expect(formatPostalAddress({ city: null, street: "", house: null })).toBeNull();
  });
});

describe("closureTitle", () => {
  it("называет муфту почтовым адресом", () => {
    expect(
      closureTitle({
        number: "3",
        kind: "МУФТА",
        city: "Симферополь",
        street: "Коцюбинского",
        house: "15",
      }),
    ).toBe("г. Симферополь, ул. Коцюбинского, д. 15");
  });

  it("без адреса оставляет привычный номер", () => {
    expect(closureTitle({ number: "12", kind: "МУФТА" })).toBe("Муфта №12");
  });

  it("учитывает тип муфты — кросс это не муфта", () => {
    expect(closureTitle({ number: "7", kind: "КРОСС" })).toBe("Кросс №7");
    expect(closureTitle({ number: "7", kind: "орш" })).toBe("Орш №7");
  });

  it("не падает на пустом типе", () => {
    expect(closureTitle({ number: "9", kind: null })).toBe("Муфта №9");
  });
});

describe("parseCoordinates", () => {
  it("читает строку из карт: широта, долгота", () => {
    expect(parseCoordinates("44.7234, 37.7681")).toEqual({ lat: 44.7234, lng: 37.7681 });
  });

  it("принимает пробел или точку с запятой вместо запятой", () => {
    expect(parseCoordinates("44.95398 34.12554")).toEqual({ lat: 44.95398, lng: 34.12554 });
    expect(parseCoordinates(" 44,95398; 34,12554 ")).toEqual({ lat: 44.95398, lng: 34.12554 });
  });

  it("понимает десятичную запятую, если стоит только одна", () => {
    expect(parseCoordinates("44,95398")).toEqual({ lat: 44.95398, lng: null });
  });

  it("минус и ведущий плюс — тоже координаты", () => {
    expect(parseCoordinates("-44.7234, +37.7681")).toEqual({ lat: -44.7234, lng: 37.7681 });
  });

  it("пустая строка — координат нет, без ошибки", () => {
    expect(parseCoordinates("")).toEqual({ lat: null, lng: null });
    expect(parseCoordinates("   ")).toEqual({ lat: null, lng: null });
  });

  it("сообщает, если координат не две, или они вне диапазона", () => {
    expect(parseCoordinates("44.7 37.7 12")).toEqual({ error: "Нужны два числа: широта и долгота" });
    expect(parseCoordinates("94.7, 37.7")).toEqual({ error: "Широта должна быть от -90 до 90" });
    expect(parseCoordinates("44.7, 237.7")).toEqual({ error: "Долгота должна быть от -180 до 180" });
    expect(parseCoordinates("муфта")).toEqual({ error: "Похоже на координаты, но числа не нашлись" });
  });

  it("недописанную первую половину отдаёт без ошибки — форма допишет её сама", () => {
    expect(parseCoordinates("44.7234")).toEqual({ lat: 44.7234, lng: null });
  });
});

describe("formatCoordinates / formatLatLng", () => {
  it("совмещает широту и долготу в одну строку, как в картах", () => {
    expect(formatCoordinates(44.7234, 37.7681)).toBe("44.7234, 37.7681");
    expect(formatLatLng(44.7234, 37.7681)).toBe("44.7234, 37.7681");
  });

  it("не печатает половину координат, если второй нет", () => {
    expect(formatCoordinates(44.7234, null)).toBeNull();
    expect(formatLatLng(null, null)).toBeNull();
  });
});
