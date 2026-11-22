export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  IN_PROGRESS: "В работе",
  DONE: "Сдана",
};

export const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[var(--color-track)] text-[var(--color-ink-500)]",
  IN_PROGRESS: "bg-[var(--color-warn-soft)] text-[var(--color-warn)]",
  DONE: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
};

export const SPLICE_KIND_LABELS: Record<string, string> = {
  FUSION: "Сварка",
  MECHANICAL: "Мех. соединитель",
  PIGTAIL: "Пигтейл",
  SPLITTER: "Сплиттер",
  TRANSIT: "Транзит",
};

export const FIBER_STATUS_LABELS: Record<string, string> = {
  FREE: "Свободно",
  SPLICED: "Сварено",
  TRANSIT: "Транзит",
  DAMAGED: "Повреждено",
};
