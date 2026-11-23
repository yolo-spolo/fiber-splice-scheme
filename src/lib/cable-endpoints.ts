import { closureTitle } from "./address";

/**
 * Муфта в списке выбора для полей «Откуда» и «Куда» кабеля.
 * `projectId` нужен, чтобы отклонять муфты чужого объекта.
 */
export type ClosureOption = {
  id: string;
  number: string;
  kind: string;
  city: string | null;
  street: string | null;
  house: string | null;
  projectId: string;
};

export type CableEndpoint = { closureId: string | null; location: string | null };

/**
 * Резолвит конец кабеля из формы.
 *
 * Если выбрана муфта — ссылка валидируется по объекту, а текст становится
 * снимком её адреса: схема и документ печатаются без запросов к базе.
 * Если муфта не выбрана — остаётся free-text: адрес можно вписать, не
 * создавая муфту (например, «Колодец К-14»).
 */
export function resolveCableEndpoint(
  input: { closureId?: string | null; location?: string | null },
  options: ClosureOption[],
  projectId: string | null,
): CableEndpoint | { error: string } {
  const closureId = input.closureId?.trim() || null;
  const text = input.location?.trim() || null;

  if (!closureId) return { closureId: null, location: text };

  const closure = options.find((option) => option.id === closureId);
  if (!closure) return { error: "Муфта не найдена на объекте" };
  if (projectId && closure.projectId !== projectId) {
    return { error: "Муфта относится к другому объекту" };
  }

  return { closureId: closure.id, location: closureTitle(closure) };
}
