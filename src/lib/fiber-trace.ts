/**
 * Трассировка волокна через муфты.
 *
 * Как устроены данные. Кабель записан в каждой муфте своей записью
 * (`Cable.closureId`) и знает, в какие муфты уходят его концы
 * (`fromClosureId` / `toClosureId`); записи соседних муфт ссылаются друг на
 * друга. Волокно адресуется триадой кабель → модуль → позиция, поэтому на
 * другом конце кабеля та же жила — тот же (модуль, позиция) в соседней записи.
 *
 * Свет по муфте проходит так: пришёл по кабелю → ушёл через сварку на другую
 * жилу → эта жила уходит по своему кабелю в соседнюю муфту → там снова сварка.
 * Значит, у жилы в муфте не больше двух соседей, и они разного рода:
 *
 *   сварка — вторая жила в этой же муфте;
 *   кабель — та же жила на другом конце кабеля, в соседней муфте.
 *
 * Отсюда обход: из жилы идём туда, откуда не пришли. Начинаем в обе стороны —
 * получается весь путь абонента, а не половина.
 *
 * Модуль без базы и без React: страница загружает данные и рисует шаги.
 */

export type TraceClosure = {
  id: string;
  number: string;
  kind: string;
  city: string | null;
  street: string | null;
  house: string | null;
};

export type TraceCable = {
  id: string;
  label: string;
  closureId: string;
  fromClosureId: string | null;
  toClosureId: string | null;
  fromLocation: string | null;
  toLocation: string | null;
};

export type TraceFiber = {
  id: string;
  cableId: string;
  moduleIndex: number;
  position: number;
  status: string;
  label: string | null;
};

export type TraceSplice = {
  closureId: string;
  fiberAId: string;
  fiberBId: string;
  lossDb: number | null;
};

export type TraceData = {
  closures: TraceClosure[];
  cables: TraceCable[];
  fibers: TraceFiber[];
  splices: TraceSplice[];
};

export type TraceStop =
  /** Дальше идти некуда: свободный конец, повреждение, кабель без второго конца. */
  | { kind: "end"; reason: string }
  /** Вернулись туда, где уже были: кольцо в схеме. */
  | { kind: "loop"; reason: string }
  /** Данные противоречивы: несколько сварок на жиле, предел шагов. */
  | { kind: "broken"; reason: string };

/** Как жила соединена с соседней. */
export type TraceLink = "splice" | "cable";

export type TraceStep = {
  closure: TraceClosure;
  cable: TraceCable;
  fiber: TraceFiber;
  /** Чем эта жила соединена со следующей; null — конец маршрута. */
  link: TraceLink | null;
  /** Сварка в этой муфте: с какой жилой и с какими потерями. */
  splice: { with: TraceFiber; withCable: TraceCable; lossDb: number | null } | null;
};

/**
 * Куда идти из этой муфты: адрес следующей муфты или текст, куда уходит
 * кабель. Нужно, чтобы маршрут читался как путь, а не как список записей.
 */
export function stepExit(step: TraceStep): string | null {
  if (!step.link) return null;
  if (step.link === "splice") return null;
  const exit = cableExit(step.cable, step.closure.id);
  return exit?.location ?? null;
}

export type Trace = {
  steps: TraceStep[];
  /** Почему маршрут кончается в начале пути и в конце. */
  startStop: TraceStop;
  endStop: TraceStop;
};

const MAX_STEPS = 60;

/** Адрес волокна так, как его называют в схеме: «М1 В5». */
export function fiberAddress(fiber: { moduleIndex: number; position: number }): string {
  return `М${fiber.moduleIndex} В${fiber.position}`;
}

/**
 * Куда кабель уходит из этой муфты.
 *
 * Запись кабеля лежит в каждой муфте, через которую он проходит, и хранит
 * свои концы. Поэтому «другой конец» — это конец, не совпадающий с текущей
 * муфтой. Транзитный кабель (оба конца в чужих муфтах) уходит в тот из них,
 * откуда мы не пришли; если и это не решает, направление неизвестно.
 *
 * Волокно двустороннее, поэтому «откуда» и «куда» у кабеля — это просто два
 * его конца, а не направление движения света: из муфты можно уйти в любой
 * из них.
 */
export function cableExit(
  cable: TraceCable,
  closureId: string,
  cameFromClosureId?: string | null,
): { closureId: string; location: string | null } | null {
  const ends = [
    { closureId: cable.fromClosureId, location: cable.fromLocation },
    { closureId: cable.toClosureId, location: cable.toLocation },
  ].filter((end): end is { closureId: string; location: string | null } =>
    Boolean(end.closureId),
  );

  const other = ends.filter((end) => end.closureId !== closureId);
  if (other.length === 1) return other[0];
  if (other.length === 0) return null;

  // Транзитная запись: оба конца в чужих муфтах. Сторону задаёт та, откуда
  // пришли; без неё направление неизвестно, и угадывать его нельзя.
  const forward = other.filter((end) => end.closureId !== cameFromClosureId);
  return forward.length === 1 ? forward[0] : null;
}

/** Жила в муфте: узел маршрута. */
type Node = { closureId: string; fiberId: string };
const keyOf = (node: Node) => `${node.closureId}:${node.fiberId}`;

/** Соседи жилы: по сварке и по кабелю. Хотя бы один может отсутствовать. */
type Edges = {
  splice: Node | null;
  cable: Node | null;
  problem: string | null;
  /** Кабель ведёт обратно в муфту, откуда мы пришли: это кольцо, а не конец. */
  backTo: string | null;
};

class TraceIndex {
  readonly closures: Map<string, TraceClosure>;
  readonly cables: Map<string, TraceCable>;
  readonly fibers: Map<string, TraceFiber>;
  private readonly splicesByFiber = new Map<string, TraceSplice[]>();
  private readonly cablesByClosure = new Map<string, TraceCable[]>();
  private readonly fibersByCable = new Map<string, TraceFiber[]>();

  constructor(data: TraceData) {
    this.closures = new Map(data.closures.map((c) => [c.id, c]));
    this.cables = new Map(data.cables.map((c) => [c.id, c]));
    this.fibers = new Map(data.fibers.map((f) => [f.id, f]));

    for (const splice of data.splices) {
      for (const fiberId of [splice.fiberAId, splice.fiberBId]) {
        const key = `${splice.closureId}:${fiberId}`;
        this.splicesByFiber.set(key, [...(this.splicesByFiber.get(key) ?? []), splice]);
      }
    }
    for (const cable of data.cables) {
      this.cablesByClosure.set(cable.closureId, [
        ...(this.cablesByClosure.get(cable.closureId) ?? []),
        cable,
      ]);
    }
    for (const fiber of data.fibers) {
      this.fibersByCable.set(fiber.cableId, [
        ...(this.fibersByCable.get(fiber.cableId) ?? []),
        fiber,
      ]);
    }
  }

  splicesAt(closureId: string, fiberId: string): TraceSplice[] {
    return this.splicesByFiber.get(`${closureId}:${fiberId}`) ?? [];
  }

  fiberInCable(cableId: string, moduleIndex: number, position: number): TraceFiber | null {
    return (
      this.fibersByCable
        .get(cableId)
        ?.find((f) => f.moduleIndex === moduleIndex && f.position === position) ?? null
    );
  }

  cablesAt(closureId: string): TraceCable[] {
    return this.cablesByClosure.get(closureId) ?? [];
  }
}

/**
 * Запись того же кабеля в соседней муфте.
 *
 * Каждый конец кабеля хранится в своей муфте, и подписи у двух записей
 * расходятся: на одном конце «Коцюбинского 53А», на другом «Коцюбинского 53».
 * Общего идентификатора у записей нет, поэтому сначала ищем встречную ссылку
 * на текущую муфту, а спор между несколькими кабелями решает подпись.
 *
 * Подпись сравниваем не на равенство, а на вложенность: «53А» и «53» — один
 * кабель, дописанный на другом конце. Равенство здесь не работает как раз
 * потому, что подписи расходятся, а совпадение начала — работает.
 */
function continuationCable(
  index: TraceIndex,
  cable: TraceCable,
  fromClosureId: string,
  toClosureId: string,
): TraceCable | null {
  const mutual = index
    .cablesAt(toClosureId)
    .filter((c) => c.fromClosureId === fromClosureId || c.toClosureId === fromClosureId);
  if (mutual.length === 1) return mutual[0];
  if (mutual.length === 0) return null;

  const exact = mutual.filter((c) => c.label === cable.label);
  if (exact.length === 1) return exact[0];

  const similar = mutual.filter((c) => labelsMatch(c.label, cable.label));
  return similar.length === 1 ? similar[0] : null;
}

/**
 * Похожи ли две подписи на один кабель: одна начинается с другой.
 * Слишком короткое общее начало ничего не значит («К1» и «К12» — разные
 * кабели), поэтому требуем хотя бы четыре символа.
 */
function labelsMatch(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  return short.length >= 4 && long.startsWith(short);
}

/**
 * Соседи жилы. Если продолжение должно быть, но данные его не описывают,
 * возвращаем причину: монтажнику важно различать «дальше ничего нет» и
 * «дальше не записано».
 */
function edgesOf(index: TraceIndex, node: Node, cameFrom: string | null = null): Edges {
  const fiber = index.fibers.get(node.fiberId);
  const cable = fiber ? index.cables.get(fiber.cableId) : undefined;
  if (!fiber || !cable) {
    return {
      splice: null,
      cable: null,
      problem: "Волокно или кабель не найдены в данных",
      backTo: null,
    };
  }

  let problem: string | null = null;
  let splice: Node | null = null;
  const splices = index.splicesAt(node.closureId, node.fiberId);
  if (splices.length > 1) {
    problem = `В этой муфте у волокна ${splices.length} сварок — маршрут неоднозначен`;
  } else if (splices.length === 1) {
    const pairedId =
      splices[0].fiberAId === node.fiberId ? splices[0].fiberBId : splices[0].fiberAId;
    if (index.fibers.has(pairedId)) {
      splice = { closureId: node.closureId, fiberId: pairedId };
    } else {
      problem = "Сварка ссылается на волокно, которого нет в данных";
    }
  }

  let next: Node | null = null;
  let backTo: string | null = null;
  const exit = cableExit(cable, node.closureId, cameFrom);
  if (exit) {
    const continuation = continuationCable(index, cable, node.closureId, exit.closureId);
    if (!continuation) {
      problem ??= `Кабель «${cable.label}» не найден в муфте ${closureLabel(index, exit.closureId)} — маршрут обрывается`;
    } else {
      // Та же жила на другом конце кабеля: модуль и позиция сохраняются.
      const same = index.fiberInCable(continuation.id, fiber.moduleIndex, fiber.position);
      if (!same) {
        problem ??= `В муфте ${closureLabel(index, exit.closureId)} нет волокна ${fiberAddress(fiber)} кабеля «${continuation.label}»`;
      } else {
        next = { closureId: exit.closureId, fiberId: same.id };
      }
    }
  } else if (cameFrom && [cable.fromClosureId, cable.toClosureId].includes(cameFrom)) {
    // Выход один и он же — откуда пришли: кабель уводит назад.
    backTo = cameFrom;
  }

  return { splice, cable: next, problem, backTo };
}

function closureLabel(index: TraceIndex, closureId: string): string {
  const closure = index.closures.get(closureId);
  return closure ? `№${closure.number}` : "на другом конце";
}

/**
 * Почему маршрут кончился. Причину берём из того перехода, которого не
 * хватило: пришли по кабелю — не хватило сварки, и наоборот.
 */
function stopReason(index: TraceIndex, node: Node, enteredVia: TraceLink | null, problem: string | null): TraceStop {
  if (problem) return { kind: "end", reason: problem };

  const fiber = index.fibers.get(node.fiberId);
  if (!fiber) return { kind: "end", reason: "Волокно не найдено в данных" };
  const cable = index.cables.get(fiber.cableId);
  const closure = index.closures.get(node.closureId);

  if (enteredVia === "cable") {
    if (fiber.status === "DAMAGED") {
      return { kind: "end", reason: "Волокно повреждено — дальше сигнал не идёт" };
    }
    if (fiber.label) return { kind: "end", reason: `Конец маршрута: ${fiber.label}` };
    return { kind: "end", reason: "Сварки нет — волокно кончается в этой муфте" };
  }

  // Пришли через сварку: дальше должен быть кабель.
  if (cable && closure) {
    const exit = cableExit(cable, closure.id);
    if (!exit) {
      return {
        kind: "end",
        reason: `Кабель «${cable.label}» не имеет второго конца — маршрут обрывается в этой муфте`,
      };
    }
    const nextClosure = index.closures.get(exit.closureId);
    return {
      kind: "end",
      reason: `В муфте ${nextClosure ? `№${nextClosure.number}` : "на другом конце"} нет продолжения кабеля «${cable.label}»`,
    };
  }
  return { kind: "end", reason: "Дальше маршрута нет" };
}

/**
 * Шаги в одну сторону от жилы, начиная с её соседа. `enteredVia` — каким
 * переходом пришли в первый узел, чтобы выбрать другой.
 */
function walk(
  index: TraceIndex,
  first: { node: Node; via: TraceLink },
): { nodes: { node: Node; via: TraceLink | null }[]; stop: TraceStop } {
  const nodes: { node: Node; via: TraceLink | null }[] = [];
  const visited = new Set<string>();
  let current = first;
  /**
   * Муфта, из которой мы пришли в текущую. Нужна транзитным записям: у них оба
   * конца в чужих муфтах, и сторону задаёт именно она. Обновляется только при
   * переходе по кабелю: сварка муфту не меняет, и «откуда» остаётся прежним.
   */
  let cameFrom: string | null = null;
  let previousKey: string | null = null;

  for (let guard = 0; guard < MAX_STEPS; guard += 1) {
    if (visited.has(keyOf(current.node))) {
      return {
        nodes,
        stop: {
          kind: "loop",
          reason: `Маршрут возвращается в муфту ${closureLabel(index, current.node.closureId)}, где уже был`,
        },
      };
    }
    visited.add(keyOf(current.node));
    nodes.push({ node: current.node, via: current.via });

    const edges = edgesOf(index, current.node, cameFrom);
    if (edges.problem && !edges.splice && !edges.cable) {
      return { nodes, stop: { kind: "end", reason: edges.problem } };
    }

    // Идём туда, откуда не пришли: пришли по кабелю — уходим через сварку.
    const takeCable = current.via === "splice";
    const nextNode = takeCable ? edges.cable : edges.splice;
    if (!nextNode) {
      if (takeCable && edges.backTo) {
        return {
          nodes,
          stop: {
            kind: "loop",
            reason: `Маршрут возвращается в муфту ${closureLabel(index, edges.backTo)}, где уже был`,
          },
        };
      }
      return { nodes, stop: stopReason(index, current.node, current.via, edges.problem) };
    }
    // Назад по тому же кабелю не идём: запись кабеля есть в обеих муфтах, и
    // без этой проверки маршрут «выходит» из муфты тем же кабелем, которым
    // только что вошёл, — и упирается в собственную петлю.
    if (previousKey !== null && keyOf(nextNode) === previousKey) {
      return { nodes, stop: stopReason(index, current.node, current.via, edges.problem) };
    }
    // Уходим по кабелю — значит, для следующей муфты мы пришли именно отсюда.
    if (takeCable) cameFrom = current.node.closureId;
    previousKey = keyOf(current.node);
    current = { node: nextNode, via: takeCable ? "cable" : "splice" };
  }

  return {
    nodes,
    stop: { kind: "broken", reason: `Больше ${MAX_STEPS} шагов: проверьте схему на петли` },
  };
}

function stepOf(index: TraceIndex, node: Node): TraceStep {
  const fiber = index.fibers.get(node.fiberId)!;
  const cable = index.cables.get(fiber.cableId)!;
  const closure = index.closures.get(node.closureId)!;

  const splices = index.splicesAt(node.closureId, node.fiberId);
  const splice = splices.length === 1 ? splices[0] : null;
  const pairedId = splice ? (splice.fiberAId === fiber.id ? splice.fiberBId : splice.fiberAId) : null;
  const paired = pairedId ? index.fibers.get(pairedId) : undefined;
  const pairedCable = paired ? index.cables.get(paired.cableId) : undefined;

  return {
    closure,
    cable,
    fiber,
    link: null,
    splice:
      paired && pairedCable
        ? { with: paired, withCable: pairedCable, lossDb: splice?.lossDb ?? null }
        : null,
  };
}

/**
 * Весь маршрут жилы: в обе стороны от неё. `null` — волокна нет в данных:
 * id мог остаться в закладке после удаления кабеля, и это не повод падать.
 */
export function traceFiber(data: TraceData, fiberId: string): Trace | null {
  const index = new TraceIndex(data);
  const fiber = index.fibers.get(fiberId);
  const cable = fiber ? index.cables.get(fiber.cableId) : undefined;
  if (!fiber || !cable || !index.closures.has(cable.closureId)) return null;

  const start: Node = { closureId: cable.closureId, fiberId: fiber.id };
  const edges = edgesOf(index, start);

  // Две половины — по одному переходу каждая. Если перехода нет, половина
  // пуста, а причина конца берётся у самой жилы: иначе обе половины пошли бы
  // одним и тем же путём и маршрут задвоился бы.
  const forward = edges.splice
    ? walk(index, { node: edges.splice, via: "splice" })
    : { nodes: [], stop: stopReason(index, start, "cable", edges.problem) };
  const backward = edges.cable
    ? walk(index, { node: edges.cable, via: "cable" })
    : { nodes: [], stop: stopReason(index, start, "splice", edges.problem) };

  const steps: TraceStep[] = [];
  // Обратная половина читается от дальнего конца к жиле — разворачиваем.
  for (let i = backward.nodes.length - 1; i >= 0; i -= 1) {
    steps.push(stepOf(index, backward.nodes[i].node));
  }
  steps.push(stepOf(index, start));
  for (const item of forward.nodes) steps.push(stepOf(index, item.node));

  // Связь шага со следующим: та же муфта — сварка, разные — кабель.
  for (let i = 0; i < steps.length; i += 1) {
    const next = steps[i + 1];
    steps[i].link = next ? (steps[i].closure.id === next.closure.id ? "splice" : "cable") : null;
  }

  return { steps, startStop: backward.stop, endStop: forward.stop };
}
