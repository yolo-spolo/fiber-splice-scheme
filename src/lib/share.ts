import { prisma } from "@/lib/prisma";
import { loadClosure } from "@/lib/closure-data";
import { shareAllowsClosure } from "@/lib/share-access";

export { shareAllowsClosure, shareCanEdit } from "@/lib/share-access";

export async function resolveShareToken(token: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      project: true,
      closure: { include: { project: true } },
    },
  });
  if (!link) return { status: "notfound" as const };
  if (link.revokedAt) return { status: "revoked" as const };
  if (link.expiresAt && link.expiresAt < new Date()) return { status: "expired" as const };
  return { status: "ok" as const, link };
}

export type ResolvedShare = Extract<Awaited<ReturnType<typeof resolveShareToken>>, { status: "ok" }>["link"];

/**
 * Пускает ли ссылка к муфте с этим id — с проверкой объекта.
 *
 * Для страниц, где муфта ещё не загружена: объект ссылки у ссылки на объект
 * свой, у ссылки на муфту — родительский, и сравнить их без запроса нельзя.
 * Ссылка на муфту проверяется без базы: у неё фиксированный `closureId`.
 */
export async function shareAllowsClosureId(
  link: ResolvedShare,
  closureId: string,
): Promise<boolean> {
  // Ссылка на муфту отвечает без базы: у неё ровно один id.
  if (link.closureId) return link.closureId === closureId;
  if (!link.projectId) return false;
  const scope = await prisma.closure.findUnique({
    where: { id: closureId },
    select: { projectId: true },
  });
  if (!scope) return false;
  return shareAllowsClosure(link, { id: closureId, projectId: scope.projectId });
}

/**
 * Муфта по ссылке — сразу с проверкой, что она из объекта этой ссылки.
 *
 * Три исхода, а не два: «нет такой муфты» и «эта ссылка её не открывает» —
 * разные ответы для человека. Первый отдаёт 404, второй — понятное «ссылка
 * выдана на другую муфту».
 */
export async function loadSharedClosure(link: ResolvedShare, closureId: string) {
  const closure = await loadClosure(closureId);
  if (!closure) return { status: "notfound" as const };
  if (!shareAllowsClosure(link, closure)) return { status: "forbidden" as const };
  return { status: "ok" as const, closure };
}
