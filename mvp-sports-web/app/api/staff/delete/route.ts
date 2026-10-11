import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { deleteStaff, StaffError } from "@/services/server/staff";

// Elimina a un miembro del personal: su acceso (Firebase Auth), su perfil y su ficha.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`staff_delete_${caller.uid}`, 10, 60_000))) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  const { staffId } = await request.json().catch(() => ({}));
  if (typeof staffId !== "string" || !/^[A-Za-z0-9_-]{6,128}$/.test(staffId)) return NextResponse.json({ error: "Personal no indicado." }, { status: 400 });
  try {
    await deleteStaff(caller.uid, staffId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StaffError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("staff delete", e);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }
}
