"use client";

import { useState } from "react";
import Link from "next/link";
import { EditScopeProvider } from "@/components/edit-scope";
import { StatusControl } from "@/app/closures/[id]/(detail)/status-control";
import { EditClosureButton } from "@/components/edit-dialogs";
import { CableCard } from "@/app/closures/[id]/(detail)/cable-card";
import { NewCableDialog } from "@/app/closures/[id]/(detail)/new-cable-dialog";
import { CassettePanel } from "@/app/closures/[id]/(detail)/cassette-panel";
import { SpliceEditor } from "@/app/closures/[id]/(detail)/splice/splice-editor";
import { PhotoManager } from "@/app/closures/[id]/(detail)/photos/photo-manager";
import { closureKindLabel, closureTitle, formatLatLng, formatPostalAddress } from "@/lib/address";
import { STATUS_LABELS } from "@/lib/labels";
import { fiberStats, type ClosureData } from "@/lib/closure-data";
import { actorLabel } from "@/lib/history-labels";

type Tab = "cables" | "splice" | "photos" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "cables", label: "Кабели" },
  { key: "splice", label: "Схема сварок" },
  { key: "photos", label: "Фото" },
  { key: "history", label: "История" },
];

/**
 * Редактор муфты для гостя по ссылке с правкой. Собран из тех же компонентов,
 * что и интерфейс владельца, но внутри EditScopeProvider: каждое действие
 * прикладывает токен, и сервер решает, можно ли его выполнить.
 */
export function GuestClosureEditor({
  token,
  closure,
  guestName,
  cableTypes,
  siblingClosures,
  history,
  canEdit,
}: {
  token: string;
  closure: ClosureData;
  guestName: string | null;
  cableTypes: {
    id: string;
    name: string;
    fiberCount: number;
    moduleCount: number;
    colorScheme: string;
    colorOrder: number[];
    moduleColors?: number[];
    ownership: string;
    sheathColor: string | null;
    note: string | null;
  }[];
  siblingClosures: {
    id: string;
    number: string;
    kind: string;
    city: string | null;
    street: string | null;
    house: string | null;
    projectId: string;
  }[];
  history: {
    id: string;
    actorKind: string;
    actorName: string;
    action: string;
    summary: string;
    createdAt: string;
  }[];
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<Tab>("cables");
  const stats = fiberStats(closure);
  const splicedIds = new Set(closure.splices.flatMap((s) => [s.fiberAId, s.fiberBId]));
  const coordinates = formatLatLng(closure.lat, closure.lng);

  return (
    <EditScopeProvider shareToken={token}>
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="min-w-0 break-words text-[20px] leading-tight sm:text-[22px]">
            {closureTitle(closure)}
          </h1>
          <span className="chip shrink-0 tabular-nums">№{closure.number}</span>
          <span className="chip uppercase">{closure.kind}</span>
          <span className="chip">{STATUS_LABELS[closure.status]}</span>
          {canEdit && (
            <div className="ml-auto flex items-center gap-2">
              <EditClosureButton closure={closure} />
              <StatusControl closureId={closure.id} status={closure.status} />
            </div>
          )}
        </div>
        <p className="mt-1 flex flex-wrap gap-x-2 text-[12.5px] text-[var(--color-ink-500)]">
          {formatPostalAddress(closure) && <span>{closureKindLabel(closure.kind)}</span>}
          {coordinates && <span className="font-mono tabular-nums">{coordinates}</span>}
          {guestName && <span>правит: {guestName}</span>}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <StatTile label="Волокон" value={stats.total} />
        <StatTile label="Сварено" value={stats.spliced} />
        <StatTile label="Свободно" value={stats.free} />
        <StatTile label="Транзит" value={stats.transit} />
        <StatTile label="Повреждено" value={stats.damaged} />
      </div>

      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-sunken)] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="tab shrink-0 px-3 text-[13px]"
            data-active={tab === item.key}
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "cables" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px]">Кабели в муфте</h2>
            {canEdit && (
              <NewCableDialog
                closureId={closure.id}
                cableTypes={cableTypes}
                closures={siblingClosures}
              />
            )}
          </div>
          {closure.cables.length === 0 ? (
            <p className="card px-4 py-6 text-center text-[13px] text-[var(--color-ink-500)]">
              Кабелей пока нет.
            </p>
          ) : (
            <div className="space-y-3">
              {closure.cables.map((cable) => (
                <CableCard
                  key={cable.id}
                  cable={cable}
                  splicedIds={[...splicedIds]}
                  closureId={closure.id}
                  closures={siblingClosures}
                />
              ))}
            </div>
          )}
          <CassettePanel
            closureId={closure.id}
            cassettes={closure.cassettes}
            splices={closure.splices.map((s) => ({ id: s.id, cassetteId: s.cassetteId }))}
          />
        </div>
      )}

      {tab === "splice" && (
        <SpliceEditor
          closureId={closure.id}
          cables={closure.cables.map((cable) => ({
            id: cable.id,
            label: cable.label,
            type: cable.type,
            ownership: cable.ownership,
            moduleCount: cable.moduleCount,
            colorScheme: cable.colorScheme,
            moduleColors: cable.moduleColors,
            fibers: cable.fibers.map((f) => ({
              id: f.id,
              moduleIndex: f.moduleIndex,
              position: f.position,
              colorCode: f.colorCode,
              label: f.label,
              status: f.status,
            })),
          }))}
          cassettes={closure.cassettes.map((c) => ({
            id: c.id,
            number: c.number,
            capacity: c.capacity,
            label: c.label,
          }))}
          splices={closure.splices.map((s) => ({
            id: s.id,
            fiberAId: s.fiberAId,
            fiberBId: s.fiberBId,
            cassetteId: s.cassetteId,
            kind: s.kind,
            lossDb: s.lossDb,
          }))}
        />
      )}

      {tab === "photos" && (
        <PhotoManager
          closureId={closure.id}
          cassettes={closure.cassettes.map((c) => ({ id: c.id, number: c.number, label: c.label }))}
          photos={closure.photos.map((p) => ({
            id: p.id,
            file: p.file,
            thumb: p.thumb,
            caption: p.caption,
            cassetteId: p.cassetteId,
            pins: p.pins as { x: number; y: number; refType: string; refId: string; label: string }[],
          }))}
        />
      )}

      {tab === "history" && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
            <h2 className="text-[14px]">История изменений</h2>
            <Link href={`/s/${token}/closure/${closure.id}/history`} className="text-[12px] text-[var(--color-accent)]">
              Вся история
            </Link>
          </div>
          {history.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-[var(--color-ink-400)]">
              Изменений пока нет.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {history.map((event) => (
                <li key={event.id} className="px-4 py-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
                    <span className="font-medium">{actorLabel(event)}</span>
                    <span className="text-[var(--color-ink-500)]">{event.summary}</span>
                    <span className="ml-auto text-[11px] tabular-nums text-[var(--color-ink-400)]">
                      {new Date(event.createdAt).toLocaleString("ru-RU", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </EditScopeProvider>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-3 py-2">
      <div className="text-[17px] font-semibold leading-tight tabular-nums">{value}</div>
      <div className="text-[11px] text-[var(--color-ink-400)]">{label}</div>
    </div>
  );
}
