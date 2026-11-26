import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveShareToken, type ResolvedShare } from "@/lib/share";
import { prisma } from "@/lib/prisma";
import { safeUploadPath } from "@/lib/storage";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Файлы для публичной ссылки. Токен проверяется, а путь обязан принадлежать
 * той муфте, на которую выдана ссылка — иначе по чужому токену можно
 * вытянуть фото другой муфты.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; path: string[] }> },
) {
  const { token, path } = await params;
  const resolved = await resolveShareToken(token);
  if (resolved.status !== "ok") return new NextResponse("forbidden", { status: 403 });

  const relative = path.join("/");
  const allowed = await allowedClosureId(resolved.link, relative);
  if (!allowed) return new NextResponse("forbidden", { status: 403 });

  const full = safeUploadPath(relative);
  if (!full) return new NextResponse("forbidden", { status: 403 });

  try {
    const file = await readFile(full);
    const ext = relative.split(".").pop()?.toLowerCase() ?? "jpg";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}

/**
 * Чей файл можно отдать по токену. Путь начинается с id муфты, поэтому по
 * нему видно, чьё это фото; ссылка на муфту пускает только к ней, ссылка на
 * объект — к любой муфте этого объекта.
 */
async function allowedClosureId(
  link: ResolvedShare,
  relative: string,
): Promise<string | null> {
  const [closureId] = relative.split("/");
  if (!closureId) return null;
  if (link.closureId) return link.closureId === closureId ? closureId : null;
  if (!link.projectId) return null;
  const closure = await prisma.closure.findUnique({
    where: { id: closureId },
    select: { projectId: true },
  });
  return closure?.projectId === link.projectId ? closureId : null;
}
