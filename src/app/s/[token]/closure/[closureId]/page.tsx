import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SpliceDocument } from "@/components/document";
import { PrintButton } from "@/components/print-button";
import { GuestClosureEditor } from "@/components/guest-closure-editor";
import { loadSharedClosure, resolveShareToken } from "@/lib/share";
import { shareCanEdit } from "@/lib/share-access";
import { guestEditorName } from "@/lib/edit-access";
import { loadCableTypes } from "@/lib/cable-presets";
import { closureHistory } from "@/lib/history";
import { toHistoryItem } from "@/lib/history-labels";
import { closureTitle } from "@/lib/address";
import { ShareUnavailable } from "../../share-unavailable";
import { GuestNameForm } from "../../name-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Схема одной муфты по ссылке на объект. Ссылка на муфту сюда тоже ведёт,
 * но открыть по ней можно только эту муфту — остальные отдадут «нет доступа».
 */
export default async function SharedClosurePage({
  params,
}: {
  params: Promise<{ token: string; closureId: string }>;
}) {
  const { token, closureId } = await params;
  const resolved = await resolveShareToken(token);
  if (resolved.status !== "ok") return <ShareUnavailable status={resolved.status} token={token} />;

  const { link } = resolved;
  // Загрузка и проверка одним шагом: ссылка на объект не должна открывать
  // муфту чужого объекта, а раздельные проверки успевали разойтись.
  const loaded = await loadSharedClosure(link, closureId);
  if (loaded.status === "notfound") notFound();
  if (loaded.status === "forbidden") return <ShareUnavailable status="forbidden" token={token} />;
  const { closure } = loaded;

  // Просмотр считаем только после того, как ссылка действительно открыла
  // муфту: иначе чужой id накручивал бы счётчик.
  await prisma.shareLink.update({
    where: { id: link.id },
    data: { views: { increment: 1 } },
  });

  const canEdit = shareCanEdit(link);
  const guestName = canEdit ? await guestEditorName(token) : null;
  // Ссылка с правкой, но без имени: сначала спрашиваем, кто это, и только
  // потом показываем редактор. Так в истории не появляется «кто-то».
  if (canEdit && !guestName) {
    return (
      <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
        <div className="mx-auto max-w-[460px] px-4 py-10">
          <div className="card p-5">
            <h1 className="text-[18px]">Представьтесь</h1>
            <p className="mt-1 mb-3 text-[12.5px] text-[var(--color-ink-500)]">
              Ссылка даёт право менять муфту «{closureTitle(closure)}». Имя нужно, чтобы
              исполнитель видел в истории, кто что изменил.
            </p>
            <GuestNameForm token={token} />
          </div>
        </div>
      </div>
    );
  }

  if (canEdit) {
    const [cableTypes, siblingClosures, history] = await Promise.all([
      loadCableTypes(),
      prisma.closure.findMany({
        where: { projectId: closure.projectId },
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          kind: true,
          city: true,
          street: true,
          house: true,
          projectId: true,
        },
      }),
      closureHistory(closure.id, 10),
    ]);

    return (
      <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
        <div className="no-print border-b border-[var(--color-line)] bg-[var(--color-paper)]">
          <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-2 px-4 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{closure.project.name}</div>
              <div className="text-[11.5px] text-[var(--color-ink-400)]">
                Схема сварок · с правом правки
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {link.projectId && (
                <Link href={`/s/${token}`} className="btn btn-ghost px-2.5 py-1.5 text-[13px]">
                  ← Муфты объекта
                </Link>
              )}
              <Link
                href={`/s/${token}/closure/${closure.id}/print`}
                className="btn btn-ghost px-2.5 py-1.5 text-[13px]"
              >
                Документ
              </Link>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[900px] px-4 py-5">
          <GuestClosureEditor
            token={token}
            closure={closure}
            guestName={guestName}
            cableTypes={cableTypes}
            siblingClosures={siblingClosures}
            history={history.map(toHistoryItem)}
            canEdit
          />
        </div>
      </div>
    );
  }

  return (
    <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="no-print border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-[900px] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{closure.project.name}</div>
            <div className="text-[11.5px] text-[var(--color-ink-400)]">
              Схема сварок · {link.mode === "EDIT" ? "с правом правки" : "только просмотр"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Назад к списку — только если ссылка на объект: с муфты списка нет. */}
            {link.projectId && (
              <Link href={`/s/${token}`} className="btn btn-ghost px-2.5 py-1.5 text-[13px]">
                ← Муфты объекта
              </Link>
            )}
            <PrintButton label="Скачать PDF" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[900px] px-4 py-6 print:max-w-none print:p-0">
        <div className="rounded-xl bg-[var(--color-paper)] p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
          <SpliceDocument closure={closure} fileBase={`/s/${token}/file`} />
        </div>
      </div>
    </div>
  );
}
