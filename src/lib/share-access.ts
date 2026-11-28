/**
 * Правила доступа по публичной ссылке — без базы и без Next.
 * Вынесены отдельно, чтобы их можно было проверить тестами и переиспользовать
 * на сервере и в интерфейсе.
 */

export type ShareMode = "READ" | "EDIT";

/**
 * Поля ссылки, от которых зависят права. Остальное — для вывода.
 *
 * `projectId` — объект ссылки: свой у ссылки на объект, родительский у ссылки
 * на муфту (`resolveShareToken` кладёт его из `link.closure.project.id`).
 * Без него ссылка на муфту не отвечает на вопрос «а к какому объекту».
 */
export type ShareScope = {
  projectId: string | null;
  closureId: string | null;
  mode: ShareMode;
};

/** Муфта, которую пытаются открыть по ссылке. */
export type ClosureRef = { id: string; projectId: string };

/**
 * Можно ли этой ссылкой открыть конкретную муфту.
 *
 * Муфта приходит целиком, вместе со своим объектом, и это не случайность:
 * проверка «у ссылки есть projectId» сама по себе открывала муфту любого
 * объекта, стоило подставить чужой id. Обязательный аргумент не даёт
 * забыть про объект — компилятор поймает вызов с одним id.
 */
export function shareAllowsClosure(link: ShareScope, closure: ClosureRef): boolean {
  if (link.closureId) return link.closureId === closure.id;
  if (!link.projectId) return false;
  return closure.projectId === link.projectId;
}

/** Ссылка с правом правки. Проверять на сервере в каждом действии гостя. */
export function shareCanEdit(link: ShareScope): boolean {
  return link.mode === "EDIT";
}
