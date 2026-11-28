import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { loadClosure } from "@/lib/closure-data";
import { SpliceDocument } from "@/components/document";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { closureHistory } from "@/lib/history";
import { shareLinkUrl } from "@/lib/base-url";
import { toHistoryItem } from "@/lib/history-labels";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/closures/${id}/print`);
  const closure = await loadClosure(id);
  if (!closure) notFound();

  const active = await prisma.shareLink.findFirst({
    where: { closureId: closure.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const shareUrl = active ? shareLinkUrl(active.token) : undefined;
  const qrDataUrl = shareUrl ? await QRCode.toDataURL(shareUrl, { margin: 0, width: 220 }) : undefined;
  const history = await closureHistory(closure.id, 5);

  // Предпросмотр печати не темнеет: лист документа всегда белый.
  return (
    <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="no-print sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-2 px-4 py-2.5">
          <Link href={`/closures/${closure.id}`} className="btn btn-ghost px-2.5 py-1.5 text-[13px]">
            ← Назад к муфте
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[12px] text-[var(--color-ink-400)] sm:inline">
              В диалоге печати выберите «Сохранить как PDF»
            </span>
            <PrintButton />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[900px] px-4 py-6 print:max-w-none print:p-0">
        <div className="print:block rounded-xl bg-[var(--color-paper)] p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
          <SpliceDocument
            closure={closure}
            qrDataUrl={qrDataUrl}
            shareUrl={shareUrl}
            history={history.map(toHistoryItem)}
          />
        </div>
      </div>
    </div>
  );
}
