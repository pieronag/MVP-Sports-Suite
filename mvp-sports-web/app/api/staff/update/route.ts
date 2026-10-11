import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { updateStaff, StaffError } from "@/services/server/staff";

// Edición y suspensión de personal (suspender deshabilita la cuenta y cierra sus sesiones)
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`staff_update_${caller.uid}`, 20, 60_000))) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  const { staffId, ...input } = await request.json().catch(() => ({}));
  if (typeof staffId !== "string" || !staffId) return NextResponse.json({ error: "Personal no indicado." }, { status: 400 });
  try {
    await updateStaff(caller.uid, staffId, input);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StaffError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("staff update", e);
    return NextResponse.json({ error: "No se pudieron guardar los cambios." }, { status: 500 });
  }
}
