"use client";

import { useRef, useState, useTransition } from "react";
import { deletePhoto, savePhotoPins, uploadPhoto, type Pin } from "@/lib/actions/photos";

type PhotoItem = {
  id: string;
  file: string;
  thumb: string;
  caption: string | null;
  cassetteId: string | null;
  pins: { x: number; y: number; refType: string; refId: string; label: string }[];
};

export function PhotoManager({
  closureId,
  cassettes,
  photos,
}: {
  closureId: string;
  cassettes: { id: string; number: number; label: string | null }[];
  photos: PhotoItem[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState<PhotoItem | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [draftPins, setDraftPins] = useState<Pin[]>([]);
  const [pinTarget, setPinTarget] = useState(cassettes[0]?.id ?? "");
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("closureId", closureId);
      formData.set("file", file);
      const res = await uploadPhoto(formData);
      if (res?.error) {
        setError(res.error);
        break;
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function openPhoto(photo: PhotoItem) {
    setActive(photo);
    setDraftPins(photo.pins as Pin[]);
    setCaption(photo.caption ?? "");
    setPinMode(false);
  }

  function addPin(e: React.MouseEvent<HTMLDivElement>) {
    if (!pinMode || !active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const cassette = cassettes.find((c) => c.id === pinTarget);
    setDraftPins((prev) => [
      ...prev,
      {
        x,
        y,
        refType: "cassette",
        refId: pinTarget,
        label: cassette ? `Кассета ${cassette.number}` : "Метка",
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="flex-1">
          <h2 className="text-[15px]">Фото муфты</h2>
          <p className="text-[12.5px] text-[var(--color-ink-500)]">
            Снимок с телефона сжимается автоматически. На фото можно поставить метки кассет.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <button type="button" className="btn btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Загружаю…" : "Добавить фото"}
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-[13px] text-[var(--color-danger)]">{error}</p>
      )}

      {photos.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-[14px] font-semibold">Фотографий пока нет</p>
          <p className="mt-1 text-[13px] text-[var(--color-ink-500)]">
            Сфотографируйте муфту до закрытия — это лучший аргумент при сдаче.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="group overflow-hidden rounded-xl border border-[var(--color-line)] bg-white text-left transition hover:border-[var(--color-accent)]"
              onClick={() => openPhoto(photo)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${photo.thumb}`} alt={photo.caption ?? "Фото муфты"} className="aspect-[4/3] w-full object-cover" />
              <div className="px-2.5 py-2">
                <div className="truncate text-[12.5px] font-medium">{photo.caption || "Без подписи"}</div>
                <div className="text-[11px] text-[var(--color-ink-400)]">
                  {photo.pins.length > 0 ? `${photo.pins.length} меток` : "без меток"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-ink-950)]/85 p-3 sm:p-6">
          <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col overflow-hidden rounded-2xl bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-3.5 py-2.5">
              <span className="flex-1 truncate text-[13.5px] font-semibold">{active.caption || "Фото муфты"}</span>
              <button
                type="button"
                className={`btn px-2.5 py-1 text-[12.5px] ${pinMode ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPinMode((v) => !v)}
                disabled={cassettes.length === 0}
              >
                {pinMode ? "Кликните по фото" : "Поставить метку"}
              </button>
              <button type="button" className="btn btn-ghost px-2.5 py-1 text-[12.5px]" onClick={() => setActive(null)}>
                Закрыть
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-[var(--color-ink-950)]/90 p-2 sm:p-4">
              <div
                className={`relative mx-auto w-fit ${pinMode ? "cursor-crosshair" : ""}`}
                onClick={addPin}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${active.file}`} alt={active.caption ?? ""} className="max-h-[62vh] w-auto rounded-lg" />
                {draftPins.map((pin, i) => (
                  <span
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-accent)] text-[11px] font-bold text-white ring-2 ring-white">
                      {i + 1}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-[var(--color-line)] px-3.5 py-3">
              {pinMode && cassettes.length > 0 && (
                <label className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="text-[var(--color-ink-500)]">Метка для:</span>
                  <select className="field !w-auto !py-1 text-[12.5px]" value={pinTarget} onChange={(e) => setPinTarget(e.target.value)}>
                    {cassettes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Кассета {c.number}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {draftPins.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draftPins.map((pin, i) => (
                    <span key={i} className="chip">
                      {i + 1}. {pin.label}
                      <button
                        type="button"
                        className="text-[var(--color-ink-400)] hover:text-[var(--color-danger)]"
                        onClick={() => setDraftPins((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="field flex-1 !py-1.5 text-[13px]"
                  placeholder="Подпись к фото"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary px-3 py-1.5 text-[12.5px]"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await savePhotoPins(active.id, draftPins, caption);
                      setActive(null);
                    })
                  }
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="btn btn-danger px-3 py-1.5 text-[12.5px]"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Удалить фото?")) return;
                    start(async () => {
                      await deletePhoto(active.id);
                      setActive(null);
                    });
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
