/**
 * Правила доступа по публичной ссылке — без базы и без Next.
 * Вынесены отдельно, чтобы их можно было проверить тестами и переиспользовать
 * на сервере и в интерфейсе.
 */

export type ShareMode = "READ" | "EDIT";

/** Поля ссылки, от которых зависят права. Остальное — для вывода. */
export type ShareScope = {
  projectId: string | null;
  closureId: string | null;
  mode: ShareMode;
  /** Объект муфты: у ссылки на муфту своего projectId нет. */
  closureProjectId?: string | null;
};

/**
 * Объект, к которому даёт доступ ссылка. Ссылка на муфту открывает только её,
 * ссылка на объект — все муфты этого объекта: иначе гость по ссылке на объект
 * не смог бы открыть ни одной схемы.
 */
export function shareProjectId(link: ShareScope): string | null {
  return link.projectId ?? link.closureProjectId ?? null;
}

/** Можно ли этой ссылкой открыть конкретную муфту. */
export function shareAllowsClosure(link: ShareScope, closureId: string): boolean {
  if (link.closureId) return link.closureId === closureId;
  return Boolean(link.projectId);
}

/** Ссылка с правом правки. Проверять на сервере в каждом действии гостя. */
export function shareCanEdit(link: ShareScope): boolean {
  return link.mode === "EDIT";
}
