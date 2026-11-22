import { NextResponse } from "next/server";

/**
 * Редирект после POST с относительным Location.
 *
 * NextResponse.redirect требует абсолютный адрес, а `request.url` внутри
 * приложения равен адресу, на котором слушает процесс: при запуске с
 * `-H 0.0.0.0` это `http://0.0.0.0:3000`. Браузер уходил бы на чужой хост
 * и терял только что выставленную куку. Относительный Location (RFC 7231
 * разрешает) остаётся на том домене, с которого пришёл пользователь.
 */
export function seeOther(path: string, init?: { cookies?: { name: string; value: string; options: object }[] }) {
  const response = new NextResponse(null, { status: 303, headers: { location: path } });
  for (const cookie of init?.cookies ?? []) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
