"use client";

import { useState } from "react";
import { updateProject } from "@/lib/actions/projects";
import { updateClosure } from "@/lib/actions/closures";
import { CLOSURE_KINDS } from "@/lib/cable-types";
import { Field, Select, SubmitButton, Textarea } from "@/components/ui/fields";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink-950)]/45 sm:items-center sm:p-4"
    >
      <div className="max-h-[92dvh] w-full max-w-[540px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
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
    address: string | null;
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
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [city, setCity] = useState(closure.city ?? "");
  const [street, setStreet] = useState(closure.street ?? "");
  const [house, setHouse] = useState(closure.house ?? "");
  const [lat, setLat] = useState(closure.lat != null ? String(closure.lat) : "");
  const [lng, setLng] = useState(closure.lng != null ? String(closure.lng) : "");

  async function geocode() {
    const query = [city && `г. ${city}`, street && `ул. ${street}`, house && `д. ${house}`]
      .filter(Boolean)
      .join(", ");
    if (!query) {
      setGeoError("Заполните город и улицу");
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.lat !== "number") {
        setGeoError(data.error ?? "Не удалось определить координаты");
      } else {
        setLat(String(data.lat));
        setLng(String(data.lon));
      }
    } catch {
      setGeoError("Сеть недоступна");
    } finally {
      setGeoBusy(false);
    }
  }

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
        <Modal title={`Муфта №${closure.number}`} onClose={() => setOpen(false)}>
          {error && (
            <p className="mb-3 rounded-lg bg-[var(--color-danger-soft)] px-3 py-2 text-[12.5px] text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <form
            action={async (formData) => {
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
            <Field label="Адрес установки" name="address" defaultValue={closure.address} />

            <div className="rounded-xl border border-[var(--color-line)] p-2.5">
              <div className="mb-2 text-[12.5px] font-semibold">Почтовый адрес</div>
              <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_90px]">
                <label className="block">
                  <span className="label">Город</span>
                  <input
                    className="field"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Москва"
                  />
                </label>
                <label className="block">
                  <span className="label">Улица</span>
                  <input
                    className="field"
                    name="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Полярная"
                  />
                </label>
                <label className="block">
                  <span className="label">Дом</span>
                  <input
                    className="field"
                    name="house"
                    value={house}
                    onChange={(e) => setHouse(e.target.value)}
                    placeholder="12"
                  />
                </label>
              </div>

              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Широта</span>
                  <input
                    className="field"
                    name="lat"
                    inputMode="decimal"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="55.7558"
                  />
                </label>
                <label className="block">
                  <span className="label">Долгота</span>
                  <input
                    className="field"
                    name="lng"
                    inputMode="decimal"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="37.6173"
                  />
                </label>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost px-2.5 py-1 text-[12px]"
                  disabled={geoBusy}
                  onClick={geocode}
                >
                  {geoBusy ? "Ищу…" : "Определить по адресу"}
                </button>
                <span className="text-[11px] text-[var(--color-ink-400)]">
                  Или вставьте координаты из карт
                </span>
              </div>
              {geoError && (
                <p className="mt-1.5 text-[11.5px] text-[var(--color-danger)]">{geoError}</p>
              )}
            </div>

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
