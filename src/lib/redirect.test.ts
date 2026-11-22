import { describe, expect, it } from "vitest";
import { seeOther } from "./redirect";

describe("seeOther", () => {
  it("ставит относительный Location", async () => {
    const response = seeOther("/login?error=bad");
    expect(response.status).toBe(303);
    // Абсолютный адрес строился бы от request.url, а он равен адресу
    // прослушивания (0.0.0.0) — браузер уходил бы на чужой хост.
    expect(response.headers.get("location")).toBe("/login?error=bad");
  });

  it("выставляет куку сессии вместе с редиректом", () => {
    const response = seeOther("/", {
      cookies: [{ name: "fiber_session", value: "abc", options: { path: "/", httpOnly: true } }],
    });
    const cookie = response.cookies.get("fiber_session");
    expect(cookie?.value).toBe("abc");
    expect(response.headers.get("location")).toBe("/");
  });
});
