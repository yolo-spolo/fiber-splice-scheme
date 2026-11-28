import { describe, expect, it } from "vitest";
import { shareAllowsClosure, shareCanEdit, type ShareScope } from "./share-access";

function link(overrides: Partial<ShareScope>): ShareScope {
  return { projectId: null, closureId: null, mode: "READ", ...overrides };
}

describe("shareAllowsClosure", () => {
  it("ссылка на муфту открывает только её", () => {
    const closureShare = link({ closureId: "closure-1" });
    expect(shareAllowsClosure(closureShare, { id: "closure-1", projectId: "project-1" })).toBe(true);
    expect(shareAllowsClosure(closureShare, { id: "closure-2", projectId: "project-1" })).toBe(false);
  });

  it("ссылка на объект открывает муфту этого объекта", () => {
    const projectShare = link({ projectId: "project-1" });
    expect(shareAllowsClosure(projectShare, { id: "closure-1", projectId: "project-1" })).toBe(true);
    expect(shareAllowsClosure(projectShare, { id: "closure-2", projectId: "project-1" })).toBe(true);
  });

  // Это была настоящая дыра: «у ссылки есть projectId» само по себе
  // открывало муфту любого объекта, стоило подставить чужой id.
  it("ссылка на объект не открывает муфту чужого объекта", () => {
    const projectShare = link({ projectId: "project-1" });
    expect(shareAllowsClosure(projectShare, { id: "closure-x", projectId: "project-2" })).toBe(false);
  });

  it("ссылка без области не открывает ничего", () => {
    expect(shareAllowsClosure(link({}), { id: "closure-1", projectId: "project-1" })).toBe(false);
  });
});

describe("shareCanEdit", () => {
  it("правит только ссылка с режимом EDIT", () => {
    expect(shareCanEdit(link({ mode: "EDIT" }))).toBe(true);
    expect(shareCanEdit(link({ mode: "READ" }))).toBe(false);
  });
});
