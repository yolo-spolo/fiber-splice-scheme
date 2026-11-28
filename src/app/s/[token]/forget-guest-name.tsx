"use client";

import { useEffect } from "react";
import { forgetGuestName } from "@/lib/actions/guest";

/**
 * Стирает имя гостя, когда ссылка больше не работает.
 *
 * Сервер не может удалить cookie в чужом браузере сам — но страница, которую
 * он открыл, может. Иначе каждая отозванная ссылка оставляла бы в браузере
 * монтажника своё имя на месяц, и через десяток перевыпусков их накапливались
 * бы десятки.
 *
 * Ничего не рисует и ничего не блокирует: если экшен не ответил, страница
 * всё равно показывает «ссылка отозвана».
 */
export function ForgetGuestName({ token }: { token: string }) {
  useEffect(() => {
    void forgetGuestName(token);
  }, [token]);
  return null;
}
