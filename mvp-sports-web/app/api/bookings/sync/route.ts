import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server-auth";
import { syncBooking } from "@/services/bookingProjections";

// Recalcula horarios ocupados y reseña de una reserva tras crearla, editarla o cancelarla.
// Es idempotente y se deriva de la fuente, así que cualquier sesión puede pedirlo.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await request.json();
    const bookingId = String(body?.bookingId || "");
    if (!bookingId) return NextResponse.json({ error: "Falta la reserva" }, { status: 400 });
    const prev = body?.prev && typeof body.prev === "object"
      ? { courtId: String(body.prev.courtId || ""), date: body.prev.date, startTime: String(body.prev.startTime || "") }
      : null;
    const res = await syncBooking(bookingId, prev);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    console.error("booking sync", e);
    return NextResponse.json({ error: "No se pudo sincronizar" }, { status: 500 });
  }
}
