import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { worksAtTenant } from "@/services/server/tenantAccess";

// Respuesta del recinto a una reseña (dueño, co-dueño o personal del recinto)
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`review_reply_${caller.uid}`, 20, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const reviewId = typeof body?.reviewId === "string" ? body.reviewId : "";
  const reply = typeof body?.reply === "string" ? body.reply.trim().slice(0, 500) : "";
  if (!reviewId) return NextResponse.json({ error: "Falta la reseña." }, { status: 400 });
  if (reply.length < 2) return NextResponse.json({ error: "Escribe una respuesta." }, { status: 400 });

  const db = adminDb();
  const ref = db.collection("reviews").doc(reviewId);
  const r = (await ref.get()).data();
  if (!r) return NextResponse.json({ error: "No se encontró la reseña." }, { status: 404 });
  if (!(await worksAtTenant(caller.uid, r.venueId))) return NextResponse.json({ error: "Esta reseña no es de tus recintos." }, { status: 403 });
  await ref.update({ reply, replyDate: FieldValue.serverTimestamp(), replyBy: caller.uid });
  return NextResponse.json({ ok: true });
}
