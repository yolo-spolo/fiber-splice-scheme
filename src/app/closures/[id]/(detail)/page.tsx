import { notFound } from "next/navigation";
import { loadClosure } from "@/lib/closure-data";
import { CableCard } from "./cable-card";
import { NewCableDialog } from "./new-cable-dialog";
import { CassettePanel } from "./cassette-panel";
import { EmptyState } from "@/components/app-shell";
import { ensureCableTypeDefaults } from "@/lib/cable-presets";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const closure = await loadClosure(id);
  if (!closure) notFound();

  await ensureCableTypeDefaults();
  const cableTypes = await prisma.cableTypePreset.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      fiberCount: true,
      moduleCount: true,
      colorScheme: true,
      colorOrder: true,
      moduleColors: true,
      ownership: true,
      sheathColor: true,
      note: true,
    },
  });

  const splicedIds = new Set(closure.splices.flatMap((s) => [s.fiberAId, s.fiberBId]));

  // Справочник муфт объекта — для полей «Откуда/Куда» в диалогах кабеля.
  const siblingClosures = await prisma.closure.findMany({
    where: { projectId: closure.projectId },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      kind: true,
      city: true,
      street: true,
      house: true,
      projectId: true,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px]">Кабели в муфте</h2>
        <NewCableDialog
          closureId={closure.id}
          cableTypes={cableTypes}
          closures={siblingClosures}
        />
      </div>

      {closure.cables.length === 0 ? (
        <EmptyState
          title="Кабелей пока нет"
          hint="Добавьте кабели — волокна сгенерируются автоматически по ёмкости, с цветами по TIA-598."
          action={
            <NewCableDialog
              closureId={closure.id}
              trigger="Добавить кабель"
              cableTypes={cableTypes}
              closures={siblingClosures}
            />
          }
        />
      ) : (
        <div className="space-y-3">
          {closure.cables.map((cable) => (
            <CableCard
              key={cable.id}
              cable={cable}
              splicedIds={[...splicedIds]}
              closureId={closure.id}
              closures={siblingClosures}
            />
          ))}
        </div>
      )}

      <CassettePanel
        closureId={closure.id}
        cassettes={closure.cassettes}
        splices={closure.splices.map((s) => ({ id: s.id, cassetteId: s.cassetteId }))}
      />
    </div>
  );
}
