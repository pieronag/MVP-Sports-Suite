import { NextResponse } from "next/server";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";

// Perfil público de otros jugadores: solo datos deportivos, nunca correo, teléfono, RUT ni fecha de nacimiento.
// Las reglas de Firestore no dejan leer users/{uid} ajenos; las pantallas de jugador piden estos datos aquí.
//   GET ?ids=a,b,c          → miembros de un equipo (máx. 30)
//   GET ?top=1[&city=X]     → top 50 por experiencia
const publicView = (id: string, u: any) => ({
  uid: id,
  displayName: u.displayName || u.fullName || "Jugador MVP",
  photoURL: u.photoURL || null,
  city: u.city || "",
  mainSport: u.mainSport || "",
  position: u.position || "",
  xp: Number(u.xp) || 0,
  ovr: Number(u.ovr) || 40,
  tier: u.tier || "Bronce",
});

export async function GET(request: Request) {
  if (!(await verifyAuthedCaller(request))) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const db = adminDb();

  if (params.get("top")) {
    const city = params.get("city");
    let q = db.collection("users").where("role", "==", "player");
    if (city) q = q.where("city", "==", city);
    const snap = await q.orderBy("xp", "desc").limit(50).get();
    return NextResponse.json({ profiles: snap.docs.map((d) => publicView(d.id, d.data())) }, { headers: { "Cache-Control": "private, max-age=300" } });
  }

  const ids = [...new Set((params.get("ids") || "").split(",").filter((x) => /^[A-Za-z0-9_-]{6,128}$/.test(x)))].slice(0, 30);
  if (!ids.length) return NextResponse.json({ profiles: [] });
  const snaps = await db.getAll(...ids.map((id) => db.collection("users").doc(id)));
  return NextResponse.json({ profiles: snaps.filter((s) => s.exists).map((s) => publicView(s.id, s.data())) });
}
