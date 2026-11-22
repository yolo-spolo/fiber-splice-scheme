"use client";

import { useState } from "react";
import { createClosure } from "@/lib/actions/closures";
import { CLOSURE_KINDS } from "@/lib/cable-types";
import { Field, Select, SubmitButton, Textarea } from "@/components/ui/fields";

export function NewClosureDialog({
  projectId,
  trigger = "Добавить муфту",
}: {
  projectId: string;
  trigger?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        {trigger}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] sm:items-center sm:p-4">
          <div className="w-full max-w-[540px] rounded-t-2xl bg-[var(--color-paper)] p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-[18px]">Новая муфта</h2>
              <button
                type="button"
                className="btn btn-ghost h-8 w-8 !p-0 text-[16px]"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            {error && (
              <p className="mb-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] font-medium text-[var(--color-danger)]">
                {error}
              </p>
            )}

            <form
              action={async (formData) => {
                const res = await createClosure(formData);
                if (res?.error) setError(res.error);
              }}
              className="space-y-3"
            >
              <input type="hidden" name="projectId" value={projectId} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Номер" name="number" required placeholder="12" autoFocus />
                <Select
                  label="Тип"
                  name="kind"
                  defaultValue="МУФТА"
                  options={CLOSURE_KINDS.map((k) => ({ value: k, label: k }))}
                />
              </div>
              <Field label="Модель" name="model" placeholder="СТ-МТОК-96-2 (4/4)" />
              <Field label="Адрес установки" name="address" placeholder="Колодец К-14" />
              <Textarea label="Заметки" name="notes" rows={2} />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Отмена
                </button>
                <SubmitButton>Создать</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
