import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { loadClosure } from "@/lib/closure-data";
import { SpliceDocument } from "@/components/document";
import { ProjectCover } from "@/components/project-document";
import { PrintButton } from "@/components/print-button";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Весь объект одним файлом: титул со списком муфт, дальше документ каждой
 * муфты. Печать → «Сохранить как PDF» даёт один PDF на всю папку.
 */
export default async function ProjectPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/projects/${id}/print`);

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      customer: true,
      address: true,
      contract: true,
      notes: true,
      closures: { orderBy: { number: "asc" }, select: { id: true } },
    },
  });
  if (!project) notFound();

  // Муфты грузим тем же способом, что и одиночный документ: один рендер
  // не должен расходиться с тем, что видит сварщик на экране.
  const closures = (
    await Promise.all(project.closures.map((closure) => loadClosure(closure.id)))
  ).filter((closure): closure is NonNullable<typeof closure> => closure !== null);

  const share = await prisma.shareLink.findFirst({
    where: { projectId: project.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const shareUrl = share ? `${baseUrl}/s/${share.token}` : undefined;
  const qrDataUrl = shareUrl
    ? await QRCode.toDataURL(shareUrl, { margin: 0, width: 220 })
    : undefined;

  const generatedAt = new Date();

  return (
    <div data-theme="light" className="min-h-dvh bg-[var(--color-canvas)]">
      <div className="no-print sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center gap-2 px-4 py-2.5">
          <Link href={`/projects/${project.id}`} className="btn btn-ghost px-2.5 py-1.5 text-[13px]">
            ← К объекту
          </Link>
          <span className="hidden text-[12px] text-[var(--color-ink-400)] sm:inline">
            {closures.length} муфт · в диалоге печати выберите «Сохранить как PDF»
          </span>
          <div className="ml-auto">
            <PrintButton label="Печать / PDF" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-6 print:max-w-none print:p-0">
        <div className="print-doc rounded-xl bg-[var(--color-paper)] p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
          <ProjectCover project={project} closures={closures} generatedAt={generatedAt} />
        </div>

        {closures.map((closure, index) => (
          <div
            key={closure.id}
            className="print-doc mt-6 rounded-xl bg-[var(--color-paper)] p-6 shadow-sm sm:p-10 print:mt-0 print:rounded-none print:p-0 print:shadow-none"
          >
            <SpliceDocument
              closure={closure}
              generatedAt={generatedAt}
              qrDataUrl={qrDataUrl}
              shareUrl={shareUrl}
              // Легенда цветов — один раз на титуле, подписи — один раз в конце папки.
              legend={false}
              signatures={index === closures.length - 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
