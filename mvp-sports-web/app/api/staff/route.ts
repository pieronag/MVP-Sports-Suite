import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { createStaff, StaffError } from "@/services/server/staff";

// Alta de personal: crea la cuenta de acceso y el perfil en el servidor (el dueño solo asigna sus recintos)
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`staff_create_${caller.uid}`, 10, 60_000))) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  try {
    const r = await createStaff(caller.uid, await request.json().catch(() => ({})));
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    if (e instanceof StaffError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("staff create", e);
    return NextResponse.json({ error: "No se pudo crear el acceso. Intenta de nuevo." }, { status: 500 });
  }
}
