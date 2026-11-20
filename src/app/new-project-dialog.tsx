"use client";

import { useState } from "react";
import { createProject } from "@/lib/actions/projects";
import { Field, SubmitButton, Textarea } from "@/components/ui/fields";

export function NewProjectDialog({ trigger = "Новый объект" }: { trigger?: string }) {
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
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink-950)]/45 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-[520px] rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px]">Новый объект</h2>
                <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">
                  Реквизиты попадут в документ для заказчика
                </p>
              </div>
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
                const res = await createProject(formData);
                if (res?.error) setError(res.error);
              }}
              className="space-y-3"
            >
              <Field label="Название объекта" name="name" required placeholder="ЖК «Северный», корпус 3" autoFocus />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Заказчик" name="customer" placeholder="ООО «Ромашка»" />
                <Field label="Договор" name="contract" placeholder="№ 14/2026" />
              </div>
              <Field label="Адрес" name="address" placeholder="г. Москва, ул. Полярная, 12" />
              <Textarea label="Заметки" name="notes" rows={2} placeholder="Необязательно" />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Отмена
                </button>
                <SubmitButton>Создать объект</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
