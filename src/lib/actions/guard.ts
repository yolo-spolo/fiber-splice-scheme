import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  actorCanEditClosure,
  EDIT_FORBIDDEN,
  resolveActor,
  type EditActor,
} from "@/lib/edit-access";
import { logHistory, type HistoryEntry } from "@/lib/history";

type Tx = Prisma.TransactionClient;

/**
 * Правка записи муфты — один порядок на все действия.
 *
 * Раньше каждое из девятнадцати действий само собирало эту цепочку, и в
 * одиннадцати из них строка читалась ДО проверки прав: посторонний по
 * разнице ответов («не найдено» против «нет доступа») узнавал, существует ли
 * запись. Здесь порядок задан один раз и одинаков для всех:
 *
 *   1. кто действует (сессия владельца или ссылка гостя);
 *   2. что правим — и только потом;
 *   3. пускает ли этого человека к этой муфте;
 *   4. изменение и запись истории — одной транзакцией;
 *   5. пересчёт страниц.
 *
 * Токен передаётся по одному правилу: действие с `FormData` читает его из
 * формы, действие по id записи — аргументом. Двух способов в одном действии
 * больше нет: иначе один из них забывают.
 */
/**
 * Итог правки — строгий выбор из двух. Проверять через `"error" in result`:
 * тогда компилятор требует рассмотреть оба исхода, и «забыл показать
 * ошибку» становится ошибкой типов, а не молчаливой потерей сообщения.
 */
export type EditOutcome = { ok: true } | { error: string };

/** Найденная запись вместе с муфтой: без муфты правку некуда отнести. */
export type ScopedRow<T> = { closureId: string; row: T };

export async function editClosureRecord<T>(params: {
  shareToken?: string | null;
  /** Поиск записи. Права проверяются сразу после него, до любых изменений. */
  scope: () => Promise<ScopedRow<T> | null>;
  /** Что сказать владельцу, если записи нет. Гость получит отказ — см. ниже. */
  notFound: string;
  /** Изменение внутри транзакции. Вернуть запись истории или null, если писать нечего. */
  write: (tx: Tx, row: T, actor: EditActor) => Promise<HistoryEntry | null>;
  /** Страницы для пересчёта; по умолчанию — страница муфты. */
  revalidate?: (closureId: string) => string[];
}): Promise<EditOutcome> {
  const resolved = await resolveActor(params.shareToken);
  if ("error" in resolved) return { error: resolved.error };
  const { actor } = resolved;

  const scoped = await params.scope();
  // Гостю не сообщаем, есть ли запись: иначе перебором id он узнаёт, что
  // существует в базе. Для него «нет такой» и «не твоя» — один ответ.
  if (!scoped) return { error: actor.kind === "owner" ? params.notFound : EDIT_FORBIDDEN };

  if (!(await actorCanEditClosure(actor, scoped.closureId))) return { error: EDIT_FORBIDDEN };

  await prisma.$transaction(async (tx) => {
    const entry = await params.write(tx, scoped.row, actor);
    if (entry) await logHistory(tx, actor, scoped.closureId, entry);
  });

  const paths = params.revalidate?.(scoped.closureId) ?? [`/closures/${scoped.closureId}`];
  for (const path of paths) revalidatePath(path);
  return { ok: true };
}
