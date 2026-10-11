import { describe, it, expect } from "vitest";
import { openHours, isWithinOpenHours, dayOfWeek } from "../utils/venueSchedule";

describe("venueSchedule", () => {
  it("día de la semana sin depender de la zona horaria", () => {
    expect(dayOfWeek("2026-10-11")).toBe("sunday");
    expect(dayOfWeek("2026-10-12")).toBe("monday");
  });
  it("usa openTime/closeTime y por defecto 08 a 23", () => {
    expect(openHours({}, "2026-10-12").slots).toHaveLength(15);
    expect(openHours({ openTime: "10:00", closeTime: "14:00" }, "2026-10-12").slots).toEqual(["10:00", "11:00", "12:00", "13:00"]);
  });
  it("un día cerrado no tiene horarios (antes caía al horario por defecto)", () => {
    const v = { openTime: "08:00", closeTime: "23:00", schedule: { sunday: { isOpen: false } } };
    expect(openHours(v, "2026-10-11")).toMatchObject({ isOpen: false, slots: [] });
    expect(isWithinOpenHours(v, "2026-10-11", "10:00")).toBe(false);
    expect(isWithinOpenHours(v, "2026-10-12", "10:00")).toBe(true);
  });
  it("el horario del día manda y puede cruzar la medianoche", () => {
    const v = { schedule: { friday: { isOpen: true, open: "18:00", close: "02:00" } } };
    expect(openHours(v, "2026-10-16").slots).toEqual(["18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "00:00", "01:00"]);
    expect(isWithinOpenHours(v, "2026-10-16", "03:00")).toBe(false);
  });
});
