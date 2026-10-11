import { describe, it, expect } from "vitest";
import { academyIssue } from "../utils/academy";

const ok = { name: "Escuela E2E", instructor: "Prof. Prueba", tenantId: "t1", daysOfWeek: ["Lunes"], startTime: "18:00", endTime: "19:00", price: "30000", maxStudents: 20, startDate: "2026-11-01", endDate: "2026-12-20" };
describe("academyIssue", () => {
  it("acepta una clase completa", () => { expect(academyIssue(ok)).toBeNull(); });
  it("exige recinto, horario coherente, valor y fechas", () => {
    expect(academyIssue({ ...ok, tenantId: "" })).toMatch(/recinto/);
    expect(academyIssue({ ...ok, endTime: "17:00" })).toMatch(/término/);
    expect(academyIssue({ ...ok, price: "" })).toMatch(/valor/);
    expect(academyIssue({ ...ok, price: "0" })).toBeNull();
    expect(academyIssue({ ...ok, maxStudents: 0 })).toMatch(/cupo/);
    expect(academyIssue({ ...ok, endDate: "2026-10-01" })).toMatch(/terminar antes/);
    expect(academyIssue({ ...ok, daysOfWeek: [] })).toMatch(/día/);
  });
});
