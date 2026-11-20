import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { safeUploadPath } from "@/lib/storage";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const relative = path.join("/");
  const full = safeUploadPath(relative);
  if (!full) return new NextResponse("forbidden", { status: 403 });

  try {
    const file = await readFile(full);
    const ext = relative.split(".").pop()?.toLowerCase() ?? "jpg";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
