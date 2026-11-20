"use client";

import { useTransition } from "react";
import { setClosureStatus } from "@/lib/actions/closures";
import { STATUS_LABELS } from "@/lib/labels";

export function StatusControl({
  closureId,
  status,
}: {
  closureId: string;
  status: "DRAFT" | "IN_PROGRESS" | "DONE";
}) {
  const [pending, start] = useTransition();

  return (
    <select
      className="field !w-auto !py-1.5 text-[13px]"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as "DRAFT" | "IN_PROGRESS" | "DONE";
        start(async () => {
          await setClosureStatus(closureId, next);
        });
      }}
    >
      {(["DRAFT", "IN_PROGRESS", "DONE"] as const).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
