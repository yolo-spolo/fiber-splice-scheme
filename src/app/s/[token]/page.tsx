import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveShareToken } from "@/lib/share";
import { prisma } from "@/lib/prisma";
import { loadClosure } from "@/lib/closure-data";
import { SpliceDocument } from "@/components/document";
import { PrintButton } from "@/components/print-button";
import { closureKindLabel, closureTitle } from "@/lib/address";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveShareToken(token);

  if (resolved.status !== "ok") {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="card max-w-[420px] p-6 text-center">
          <h1 className="text-[19px]">
            {resolved.status === "notfound"
              ? "Ссылка не найдена"
              : resolved.status === "revoked"
                ? "Ссылка отозвана"
                : "Срок ссылки истёк"}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--color-ink-500)]">
            Попросите исполнителя прислать новую ссылку на схему.
          </p>
        </div>
      </div>
    );
  }

  const { link } = resolved;

  await prisma.shareLink.update({
    where: { id: link.id },
    data: { views: { increment: 1 } },
  });

  const closureId = link.closureId;
  if (!closureId) {
    const closures = link.projectId
      ? await prisma.closure.findMany({
          where: { projectId: link.projectId },
          orderBy: { number: "asc" },
          select: { id: true, number: true, kind: true, city: true, street: true, house: true },
        })
      : [];

    return (
      <div className="mx-auto max-w-[820px] px-4 py-8">
        <h1 className="text-[22px]">{link.project?.name ?? "Объект"}</h1>
        <p className="mt-1 mb-4 text-[13px] text-[var(--color-ink-500)]">
          {[link.project?.customer, link.project?.address].filter(Boolean).join(" · ")}
        </p>
        <ul className="space-y-2">
          {closures.map((c) => (
            <li key={c.id} className="card px-4 py-3 text-[14px]">
              <div className="font-medium">{closureTitle(c)}</div>
              <div className="mt-0.5 text-[12px] text-[var(--color-ink-400)]">
                {closureKindLabel(c.kind)} <span className="tabular-nums">№{c.number}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const closure = await loadClosure(closureId);
  if (!closure) notFound();

  // Публичная схема для заказчика — всегда светлая, независимо от темы исполнителя.
  return (
    <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="no-print border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-[900px] items-center gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold">{closure.project.name}</div>
            <div className="text-[11.5px] text-[var(--color-ink-400)]">
              Схема сварок · только просмотр
            </div>
          </div>
          <div className="ml-auto">
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
