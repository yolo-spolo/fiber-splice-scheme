import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveShareToken } from "@/lib/share";
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
  if (resolved.status !== "ok" || !resolved.link.closureId) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const relative = path.join("/");
  if (!relative.startsWith(`${resolved.link.closureId}/`)) {
    return new NextResponse("forbidden", { status: 403 });
  }

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
