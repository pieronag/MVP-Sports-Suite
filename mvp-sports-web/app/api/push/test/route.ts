import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { notifyUser } from "@/services/server/push";

// Notificación de prueba al propio jugador (botón "Probar" en Ajustes)
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`push_test_${caller.uid}`, 3, 60_000))) return NextResponse.json({ error: "Espera un minuto antes de probar de nuevo." }, { status: 429 });
  const sent = await notifyUser(caller.uid, { kind: "academy_enrolled", className: "las notificaciones de MVP Sports" });
  if (!sent) return NextResponse.json({ error: "No hay notificaciones activas en este dispositivo." }, { status: 409 });
  return NextResponse.json({ ok: true, sent });
}
