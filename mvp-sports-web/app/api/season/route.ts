import { NextResponse } from "next/server";
import { adminDb } from "@/services/firebase-admin";
import { toDate } from "@/services/bookingProjections";

// Temporada = trimestre calendario. Ranking por partidos jugados en la temporada (reservas no canceladas ya jugadas).
// Se calcula en el servidor y se cachea 1 h (en Spark cada lectura cuenta).
export const revalidate = 3600;

const seasonOf = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3);
  const start = new Date(d.getFullYear(), q * 3, 1);
  const end = new Date(d.getFullYear(), q * 3 + 3, 1);
  const names = ["Verano", "Otoño", "Invierno", "Primavera"]; // hemisferio sur, aproximado por trimestre
  return { start, end, label: `${names[q]} ${d.getFullYear()}` };
};

export async function GET() {
  const now = new Date();
  const { start, end, label } = seasonOf(now);
  const db = adminDb();
  const snap = await db.collection("bookings").where("date", ">=", start).where("date", "<", end).get();
  const counts = new Map<string, number>();
  for (const d of snap.docs) {
    const b: any = d.data();
    if (!b.userId || b.status === "cancelled" || b.status === "no-show" || b.isInternalMatch) continue;
    const day = toDate(b.date);
    if (!day || day.getTime() > now.getTime()) continue;
    counts.set(b.userId, (counts.get(b.userId) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  const users = await Promise.all(top.map(([uid]) => db.collection("users").doc(uid).get()));
  const rows = top.map(([uid, matches], i) => {
    const u: any = users[i].data() || {};
    if (u.role && String(u.role).toLowerCase() !== "player") return null;
    const parts = String(u.displayName || u.fullName || "Jugador").trim().split(/\s+/);
    return { uid, name: parts[1] ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0], photo: u.photoURL || "", city: u.city || "", matches };
  }).filter(Boolean);
  const endsInDays = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return NextResponse.json({ label, endsInDays, rows });
}
