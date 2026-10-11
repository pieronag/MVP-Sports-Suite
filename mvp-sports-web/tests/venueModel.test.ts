import { describe, it, expect } from "vitest";
import { normalizeVenue, isOwnerOf } from "../utils/venueModel";

describe("normalizeVenue", () => {
  it("une dueños, plan, imagen y deportes de las variantes", () => {
    const v = normalizeVenue("t1", {
      name: "Club", status: "Activo", ownerId: "a", ownerIds: ["b", "a"], plan: "PRO",
      imageURL: "https://x/img.jpg", activeSports: ["Fútbol"], sports: ["Pádel", "Fútbol"],
      coordinates: { latitude: "-34.17", longitude: -70.74, fullAddress: "San Pedro 1417" },
    });
    expect(v.ownerIds).toEqual(["a", "b"]);
    expect(v.planId).toBe("pro");
    expect(v.imageUrl).toBe("https://x/img.jpg");
    expect(v.sports).toEqual(["Fútbol", "Pádel"]);
    expect(v.location).toEqual({ lat: -34.17, lng: -70.74 });
    expect(v.address).toBe("San Pedro 1417");
    expect(v.state).toBe("active");
    expect(isOwnerOf(v, "b")).toBe(true);
  });
  it("estado suspendido en español o inglés; sin coordenadas válidas no hay ubicación", () => {
    expect(normalizeVenue("x", { status: "Suspendido" }).state).toBe("suspended");
    expect(normalizeVenue("x", { status: "inactive" }).state).toBe("suspended");
    expect(normalizeVenue("x", { coordinates: { lat: 0, lng: 0 } }).location).toBeNull();
    expect(normalizeVenue("x", {}).onlinePayments).toBe(true);
    expect(normalizeVenue("x", { isMercadopagoActive: false }).onlinePayments).toBe(false);
  });
});
