"use client";

import { useState } from "react";
import { updateProject } from "@/lib/actions/projects";
import { updateClosure } from "@/lib/actions/closures";
import { CLOSURE_KINDS } from "@/lib/cable-types";
import { Field, Select, SubmitButton, Textarea } from "@/components/ui/fields";
import { PostalAddressFields } from "@/components/postal-address-fields";
import { closureTitle } from "@/lib/address";
import { useShareToken } from "@/components/edit-scope";

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-overlay)] sm:items-center sm:p-4"
    >
      <div className="modal-panel w-full max-w-[540px] rounded-t-2xl bg-[var(--color-paper)] p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-500)]">{subtitle}</p>}
          </div>
          <button type="button" className="btn btn-ghost h-8 w-8 !p-0 text-[16px]" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EditProjectButton({
  project,
}: {
  project: { id: string; name: string; customer: string | null; address: string | null; contract: string | null; notes: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Реквизиты
      </button>
      {open && (
        <Modal title="Реквизиты объекта" subtitle="Попадают в документ для заказчика" onClose={() => setOpen(false)}>
          {error && (
            <p className="mb-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <form
            action={async (formData) => {
              const res = await updateProject(project.id, formData);
              if (res?.error) setError(res.error);
              else setOpen(false);
            }}
            className="space-y-3"
          >
            <Field label="Название объекта" name="name" required defaultValue={project.name} autoFocus />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Заказчик" name="customer" defaultValue={project.customer} />
              <Field label="Договор" name="contract" defaultValue={project.contract} />
            </div>
            <Field label="Адрес" name="address" defaultValue={project.address} />
            <Textarea label="Заметки" name="notes" rows={2} defaultValue={project.notes} />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <SubmitButton>Сохранить</SubmitButton>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function EditClosureButton({
  closure,
}: {
  closure: {
    id: string;
    projectId: string;
    number: string;
    kind: string;
    model: string | null;
    city: string | null;
    street: string | null;
    house: string | null;
    lat: number | null;
    lng: number | null;
    notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareToken = useShareToken();

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Изменить
      </button>
      {open && (
        <Modal title={closureTitle(closure)} onClose={() => setOpen(false)}>
          {error && (
            <p className="mb-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <form
            action={async (formData) => {
              if (shareToken) formData.set("shareToken", shareToken);
              const res = await updateClosure(closure.id, formData);
              if (res?.error) setError(res.error);
              else setOpen(false);
            }}
            className="space-y-3"
          >
            <input type="hidden" name="projectId" value={closure.projectId} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Номер" name="number" required defaultValue={closure.number} />
              <Select
                label="Тип"
                name="kind"
                defaultValue={closure.kind}
                options={CLOSURE_KINDS.map((k) => ({ value: k, label: k }))}
              />
            </div>
            <Field label="Модель" name="model" defaultValue={closure.model} />

            <PostalAddressFields
              defaultCity={closure.city ?? ""}
              defaultStreet={closure.street ?? ""}
              defaultHouse={closure.house ?? ""}
              defaultLat={closure.lat != null ? String(closure.lat) : ""}
              defaultLng={closure.lng != null ? String(closure.lng) : ""}
            />

            <Textarea label="Заметки" name="notes" rows={2} defaultValue={closure.notes} />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <SubmitButton>Сохранить</SubmitButton>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
