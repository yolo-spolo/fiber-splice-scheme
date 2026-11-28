"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Выбор волокна для трассы: все волокна объекта, сгруппированные по кабелю.
 *
 * Сначала идёт муфта, потом кабель, потом жила — так же, как монтажник ищет
 * на объекте. Подпись жилы, если она есть, стоит в начале строки: по ней
 * обычно и знают, кого ищут.
 */
export function TracePicker({
  closureId,
  groups,
  value,
}: {
  closureId: string;
  groups: {
    closure: { id: string; number: string; street: string | null; house: string | null };
    cable: { id: string; label: string };
    fibers: { id: string; label: string | null; moduleIndex: number; position: number }[];
  }[];
  value: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className="flex flex-wrap items-center gap-2">
      <span className="text-[12.5px] text-[var(--color-ink-500)]">Волокно</span>
      <select
        className="field max-w-full sm:max-w-[420px]"
        aria-label="Волокно для трассы"
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          start(() => {
            router.push(
              next
                ? `/closures/${closureId}/trace?fiber=${encodeURIComponent(next)}`
                : `/closures/${closureId}/trace`,
            );
          });
        }}
      >
        <option value="">— выберите волокно —</option>
        {groups.map((group) => (
          <optgroup
            key={group.cable.id}
            label={`Муфта №${group.closure.number} · ${group.cable.label}`}
          >
            {group.fibers.map((fiber) => (
              <option key={fiber.id} value={fiber.id}>
                {fiber.label ? `${fiber.label} · ` : ""}М{fiber.moduleIndex} В{fiber.position}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {pending && <span className="text-[11.5px] text-[var(--color-ink-400)]">строю…</span>}
    </label>
  );
}
