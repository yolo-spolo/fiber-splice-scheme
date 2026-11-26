import { describe, expect, it } from "vitest";
import { shareAllowsClosure, shareCanEdit, shareProjectId, type ShareScope } from "./share-access";

function link(overrides: Partial<ShareScope>): ShareScope {
  return { projectId: null, closureId: null, mode: "READ", ...overrides };
}

describe("shareAllowsClosure", () => {
  it("ссылка на муфту открывает только её", () => {
    const closureShare = link({ closureId: "closure-1" });
    expect(shareAllowsClosure(closureShare, "closure-1")).toBe(true);
    expect(shareAllowsClosure(closureShare, "closure-2")).toBe(false);
  });

  it("ссылка на объект открывает любую муфту этого объекта", () => {
    const projectShare = link({ projectId: "project-1" });
    expect(shareAllowsClosure(projectShare, "closure-1")).toBe(true);
    expect(shareAllowsClosure(projectShare, "closure-2")).toBe(true);
  });

  it("ссылка без области не открывает ничего", () => {
    expect(shareAllowsClosure(link({}), "closure-1")).toBe(false);
  });
});

describe("shareProjectId", () => {
  it("у ссылки на объект — сам объект", () => {
    expect(shareProjectId(link({ projectId: "project-1" }))).toBe("project-1");
  });

  it("у ссылки на муфту — объект этой муфты", () => {
    const closureShare = link({ closureId: "closure-1", closureProjectId: "project-2" });
    expect(shareProjectId(closureShare)).toBe("project-2");
  });
});

describe("shareCanEdit", () => {
  it("правит только ссылка с режимом EDIT", () => {
    expect(shareCanEdit(link({ mode: "EDIT" }))).toBe(true);
    expect(shareCanEdit(link({ mode: "READ" }))).toBe(false);
  });
});
