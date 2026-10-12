import { describe, it, expect } from "vitest";
import { pushFor } from "../utils/pushMessages";

describe("pushFor", () => {
  it("reserva confirmada lleva al ticket", () => {
    const p = pushFor({ kind: "booking_confirmed", bookingId: "AB12CD", venue: "Canchas MVP", date: "13 oct", time: "10:00" });
    expect(p.url).toBe("/player/ticket?bookingId=AB12CD");
    expect(p.body).toContain("Canchas MVP");
    expect(p.tag).toBe("booking-AB12CD");
  });
  it("anulación del recinto informa el monto devuelto en pesos chilenos", () => {
    const p = pushFor({ kind: "booking_cancelled_by_venue", bookingId: "X", venue: "Club", date: "13 oct", time: "10:00", refund: 18000 });
    expect(p.body).toContain("$18.000");
    expect(p.url).toBe("/player/reservas");
  });
  it("inasistencia indica cómo reclamar", () => {
    expect(pushFor({ kind: "no_show", bookingId: "X", venue: "Club" }).url).toBe("/player/reporte");
  });
});
