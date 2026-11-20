import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { SpliceEditor } from "./splice-editor";

export const dynamic = "force-dynamic";

export default async function SplicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  return (
    <SpliceEditor
      closureId={closure.id}
      cables={closure.cables.map((cable) => ({
        id: cable.id,
        label: cable.label,
        type: cable.type,
        ownership: cable.ownership,
        fibers: cable.fibers.map((f) => ({
          id: f.id,
          moduleIndex: f.moduleIndex,
          position: f.position,
          colorCode: f.colorCode,
          status: f.status,
        })),
      }))}
      cassettes={closure.cassettes.map((c) => ({
        id: c.id,
        number: c.number,
        capacity: c.capacity,
        label: c.label,
      }))}
      splices={closure.splices.map((s) => ({
        id: s.id,
        fiberAId: s.fiberAId,
        fiberBId: s.fiberBId,
        cassetteId: s.cassetteId,
        kind: s.kind,
        lossDb: s.lossDb,
      }))}
    />
  );
}
