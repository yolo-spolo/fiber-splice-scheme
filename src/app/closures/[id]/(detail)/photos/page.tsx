import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { PhotoManager } from "./photo-manager";

export const dynamic = "force-dynamic";

export default async function PhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  return (
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
  );
}
