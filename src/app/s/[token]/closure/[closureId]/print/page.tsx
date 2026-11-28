import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpliceDocument } from "@/components/document";
import { PrintButton } from "@/components/print-button";
import { loadSharedClosure, resolveShareToken } from "@/lib/share";
import { closureHistory } from "@/lib/history";
import { toHistoryItem } from "@/lib/history-labels";
import { ShareUnavailable } from "../../../share-unavailable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Печать муфты по ссылке: тот же документ, что у владельца. */
export default async function SharedClosurePrintPage({
  params,
}: {
  params: Promise<{ token: string; closureId: string }>;
}) {
  const { token, closureId } = await params;
  const resolved = await resolveShareToken(token);
  if (resolved.status !== "ok") return <ShareUnavailable status={resolved.status} token={token} />;

  const loaded = await loadSharedClosure(resolved.link, closureId);
  if (loaded.status === "notfound") notFound();
  if (loaded.status === "forbidden") return <ShareUnavailable status="forbidden" token={token} />;
  const { closure } = loaded;
  const history = await closureHistory(closure.id, 5);

  return (
    <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="no-print sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-2 px-4 py-2.5">
          <span className="text-[12px] text-[var(--color-ink-400)]">
            В диалоге печати выберите «Сохранить как PDF»
          </span>
          <div className="ml-auto">
            <PrintButton />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[900px] px-4 py-6 print:max-w-none print:p-0">
        <div className="print:block rounded-xl bg-[var(--color-paper)] p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
          <SpliceDocument
            closure={closure}
            fileBase={`/s/${token}/file`}
            history={history.map(toHistoryItem)}
          />
        </div>
      </div>
    </div>
  );
}
