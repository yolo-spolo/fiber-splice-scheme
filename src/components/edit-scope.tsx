"use client";

import { createContext, useContext } from "react";

/**
 * Токен ссылки, по которой сейчас работает гость. У владельца его нет:
 * тогда действия проверяют сессию. Контекст избавляет от протаскивания
 * токена через каждый диалог и карточку.
 */
const ShareTokenContext = createContext<string | null>(null);

export function EditScopeProvider({
  shareToken,
  children,
}: {
  shareToken?: string | null;
  children: React.ReactNode;
}) {
  return <ShareTokenContext.Provider value={shareToken ?? null}>{children}</ShareTokenContext.Provider>;
}

export function useShareToken(): string | null {
  return useContext(ShareTokenContext);
}
