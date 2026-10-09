import { describe, expect, it } from "vitest";
import { collectedAmount, durationHours, pendingAmount } from "../utils/bookingMath";

describe("durationHours", () => {
  it("usa horas y 1 h por defecto", () => {
    expect(durationHours({ duration: 1.5 })).toBe(1.5);
    expect(durationHours({})).toBe(1);
  });
  it("interpreta valores grandes como minutos (datos antiguos)", () => {
    expect(durationHours({ duration: 90 })).toBe(1.5);
  });
});

describe("collectedAmount", () => {
  it("pagado suma el total, abono lo abonado, pendiente nada", () => {
    expect(collectedAmount({ paymentStatus: "paid", totalPrice: 18000 })).toBe(18000);
    expect(collectedAmount({ paymentStatus: "partial", totalPrice: 18000, deposit: 5000 })).toBe(5000);
    expect(collectedAmount({ paymentStatus: "pending", totalPrice: 18000 })).toBe(0);
  });
  it("una anulada ya cobrada sigue contando hasta que se devuelva", () => {
    expect(collectedAmount({ paymentStatus: "paid", totalPrice: 18000 })).toBe(18000);
    expect(collectedAmount({ paymentStatus: "refunded", totalPrice: 18000 })).toBe(0);
  });
});

describe("pendingAmount", () => {
  it("no cobra reservas anuladas", () => {
    expect(pendingAmount({ status: "cancelled", paymentStatus: "pending", totalPrice: 36000 })).toBe(0);
    expect(pendingAmount({ status: "confirmed", paymentStatus: "partial", totalPrice: 36000, deposit: 10000 })).toBe(26000);
  });
});
