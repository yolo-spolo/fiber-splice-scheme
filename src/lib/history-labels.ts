/**
 * Словарь истории изменений муфты — без базы и без Next, чтобы его можно было
 * проверять тестами и использовать в интерфейсе и в документе.
 */

/**
 * Действия, которые попадают в историю муфты. Ключ — машинное имя, оно же
 * используется для отката: по нему видно, какие поля события можно вернуть.
 */
export const HISTORY_ACTIONS = {
  closureUpdate: "Муфта изменена",
  closureStatus: "Статус муфты",
  cableCreate: "Добавлен кабель",
  cableUpdate: "Кабель изменён",
  cableDelete: "Удалён кабель",
  cassetteCreate: "Добавлена кассета",
  cassetteUpdate: "Кассета изменена",
  cassetteDelete: "Удалена кассета",
  spliceCreate: "Добавлена сварка",
  spliceDelete: "Удалена сварка",
  spliceLoss: "Потери сварки",
  fiberStatus: "Статус волокна",
  fiberColor: "Цвет волокна",
  fiberLabel: "Подпись волокна",
  photoUpload: "Добавлено фото",
  photoDelete: "Удалено фото",
  photoPins: "Метки на фото",
} as const;

export type HistoryAction = keyof typeof HISTORY_ACTIONS;

/**
 * Поля, которые можно вернуть одной кнопкой. Кабель и кассету вернуть нельзя:
 * удаление тянет за собой волокна и сварки, восстанавливать их «наполовину»
 * опаснее, чем оставить как есть.
 */
export const RESTORABLE: Partial<
  Record<HistoryAction, "closure" | "fiber" | "splice" | "cassette">
> = {
  closureUpdate: "closure",
  closureStatus: "closure",
  spliceLoss: "splice",
  fiberStatus: "fiber",
  fiberColor: "fiber",
  fiberLabel: "fiber",
  cassetteUpdate: "cassette",
};

/** Подписи ролей: в интерфейсе и в PDF видно, кто это сделал. */
export function actorLabel(event: { actorKind: string; actorName: string }): string {
  return event.actorKind === "OWNER" ? event.actorName : `${event.actorName} (по ссылке)`;
}

export function actionLabel(action: string): string {
  return (HISTORY_ACTIONS as Record<string, string>)[action] ?? action;
}

/** Запись истории в виде, который рисует список: общий для владельца и гостя. */
export type HistoryViewItem = {
  id: string;
  actorKind: string;
  actorName: string;
  action: string;
  actionLabel: string;
  summary: string;
  createdAt: string;
  restorable: boolean;
};

export function toHistoryItem(event: {
  id: string;
  actorKind: string;
  actorName: string;
  action: string;
  summary: string;
  createdAt: Date;
}): HistoryViewItem {
  return {
    id: event.id,
    actorKind: event.actorKind,
    actorName: event.actorName,
    action: event.action,
    actionLabel: actionLabel(event.action),
    summary: event.summary,
    createdAt: event.createdAt.toISOString(),
    restorable: Boolean(RESTORABLE[event.action as HistoryAction]),
  };
}
