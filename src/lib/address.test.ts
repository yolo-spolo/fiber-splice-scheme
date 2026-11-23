import { describe, expect, it } from "vitest";
import { closureTitle, formatPostalAddress } from "./address";

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
