import { describe, it, expect } from "vitest";
import { bookableSports, courtsForSport, freeTimes, timesWithCourts, bookingDays, weekHours, hoursOn, slotPrice, venueCoords } from "../utils/venueBooking";
import { chileDateTime } from "../utils/chileTime";

const venue = {
  openTime: "08:00", closeTime: "23:00",
  schedule: { sunday: { isOpen: false }, saturday: { isOpen: true, open: "09:00", close: "02:00" } },
  pricing: { Padel: { weekday: { "08:00": 0, "20:00": 25000 } }, Tenis: { weekday: { "08:00": 0 } }, "Fútbol": { weekday: { "08:00": 30000 }, weekend: { "09:00": 40000 } } },
};

describe("venueBooking", () => {
  it("deportes con tarifa, sin duplicar variantes", () => {
    expect(bookableSports(venue)).toEqual(["Fútbol", "Padel"]);
    expect(bookableSports({ pricing: { Padel: { weekday: { "08:00": 1 } }, "Pádel": { weekday: { "08:00": 1 } } } })).toHaveLength(1);
  });

  it("canchas del deporte en orden natural, aceptando variantes", () => {
    const courts = [{ id: "c10", name: "Cancha 10", sport: "Pádel" }, { id: "c2", name: "Cancha 2", sport: "padel" }, { id: "f", name: "F7", sport: "Fútbol 7" }, { id: "t", name: "T", sport: "Tenis" }];
    expect(courtsForSport(courts, "Padel").map((c) => c.id)).toEqual(["c2", "c10"]);
    expect(courtsForSport(courts, "Fútbol").map((c) => c.id)).toEqual(["f"]);
  });

  it("precio igual al del checkout y del servidor, aunque la clave venga sin tilde", () => {
    expect(slotPrice(venue, "Pádel", "2026-11-12", "20:00")).toBe(25000);
    expect(slotPrice(venue, "Fútbol", "2026-11-14", "10:00")).toBe(40000);
  });

  it("horarios libres: quita tomados, pasados y la ventana de mantenimiento, no el resto del día", () => {
    const date = "2026-11-12"; // jueves, 08:00 a 23:00
    const free = { a: freeTimes(venue, date, ["20:00"]), b: freeTimes(venue, date, []) };
    expect(free.a).not.toContain("20:00");
    const courts = [
      { id: "a", name: "A" },
      { id: "b", name: "B", status: "maintenance", maintenanceStart: chileDateTime(date, 18, 0), maintenanceUntil: chileDateTime(date, 21, 0) },
    ];
    const rows = timesWithCourts(courts, free, date, chileDateTime(date, 17, 30));
    expect(rows[0].time).toBe("18:00");
    expect(rows.find((r) => r.time === "18:00")!.courts.map((c) => c.id)).toEqual(["a"]);
    expect(rows.find((r) => r.time === "20:00")).toBeUndefined();
    expect(rows.find((r) => r.time === "21:00")!.courts.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("días: 'Hoy' es el día operativo y marca los cerrados", () => {
    const days = bookingDays(chileDateTime("2026-11-15", 1, 30), 3, venue); // domingo 01:30 → aún es sábado
    expect(days.map((d) => [d.date, d.label])).toEqual([["2026-11-14", "Hoy"], ["2026-11-15", "Mañana"], ["2026-11-16", "Lun"]]);
    expect(days[1].closed).toBe(true);
  });

  it("horario semanal agrupado", () => {
    expect(weekHours(venue)).toEqual(["Lun a Vie 08:00 - 23:00", "Sáb 09:00 - 02:00", "Dom Cerrado"]);
    expect(hoursOn(venue, "2026-11-15")).toBe("Cerrado");
    expect(weekHours({ openTime: "07:00", closeTime: "22:00" })).toEqual(["Todos los días 07:00 - 22:00"]);
  });

  it("coordenadas en sus formatos", () => {
    expect(venueCoords({ location: { _lat: -33.4, _long: -70.6 } })).toEqual({ latitude: -33.4, longitude: -70.6 });
    expect(venueCoords({})).toBeNull();
  });
});
