import { afterEach, describe, expect, it } from "vitest";
import { shareBaseUrl, shareLinkUrl } from "./base-url";

const original = process.env.APP_URL;

afterEach(() => {
  if (original === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = original;
});

describe("shareBaseUrl", () => {
  it("берёт адрес из APP_URL", () => {
    process.env.APP_URL = "http://fiber.quota.ovh:4325";
    expect(shareBaseUrl()).toBe("http://fiber.quota.ovh:4325");
  });

  it("срезает хвостовой слэш, чтобы в ссылке не было двойного", () => {
    process.env.APP_URL = "https://fiber.example/";
    expect(shareLinkUrl("abc")).toBe("https://fiber.example/s/abc");
  });

  // Раньше здесь был запасной localhost — и на живом сайте ссылка для
  // заказчика вела в никуда. Теперь это ошибка, а не тихая подмена.
  it("без APP_URL падает, а не подставляет localhost", () => {
    delete process.env.APP_URL;
    expect(() => shareBaseUrl()).toThrow(/APP_URL/);
  });

  it("пустое значение считается отсутствующим", () => {
    process.env.APP_URL = "   ";
    expect(() => shareBaseUrl()).toThrow(/APP_URL/);
  });
});
