"use client";

import { useTransition } from "react";
import { setClosureStatus } from "@/lib/actions/closures";
import { STATUS_LABELS } from "@/lib/labels";
import { useShareToken } from "@/components/edit-scope";

export function StatusControl({
  closureId,
  status,
}: {
  closureId: string;
  status: "DRAFT" | "IN_PROGRESS" | "DONE";
}) {
  const [pending, start] = useTransition();
  const shareToken = useShareToken();

  return (
    <select
      className="field !w-auto !py-1.5 text-[13px]"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as "DRAFT" | "IN_PROGRESS" | "DONE";
        start(async () => {
          const result = await setClosureStatus(closureId, next, shareToken);
          if (result?.error) alert(result.error);
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
