import { NextResponse } from "next/server";
import { FieldValue, type DocumentReference, type Query } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/services/firebase-admin";

// Derecho de supresión (Ley 21.719): borra la cuenta y los datos del jugador. Lo que el recinto o la
// normativa tributaria necesitan conservar (reservas, pagos, inscripciones, reseñas) queda anonimizado.
const ANON = "Usuario eliminado";
const RECENT_LOGIN_SECONDS = 10 * 60;

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(token, true);
    if (Date.now() / 1000 - decoded.auth_time > RECENT_LOGIN_SECONDS) {
      return NextResponse.json({ error: "Por seguridad, confirma tu contraseña nuevamente." }, { status: 401 });
    }
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const db = adminDb();
  const writes: Array<(b: FirebaseFirestore.WriteBatch) => void> = [];
  const update = (ref: DocumentReference, data: Record<string, unknown>) => { writes.push((b) => b.update(ref, data)); };
  const del = (ref: DocumentReference) => { writes.push((b) => b.delete(ref)); };
  const each = async (q: Query, fn: (ref: DocumentReference, data: any) => void | Promise<void>) => {
    const snap = await q.get();
    for (const d of snap.docs) await fn(d.ref, d.data());
  };
  const where = (c: string, f: string, op: FirebaseFirestore.WhereFilterOp = "==") => db.collection(c).where(f, op, uid);

  try {
    // Se conservan anonimizados
    await each(where("bookings", "userId"), (ref) =>
      update(ref, { userId: null, clientName: ANON, clientPhone: "", userEmail: FieldValue.delete(), createdBy: FieldValue.delete(), participantIds: FieldValue.arrayRemove(uid) }));
    await each(where("bookings", "participantIds", "array-contains"), (ref) => update(ref, { participantIds: FieldValue.arrayRemove(uid) }));
    await each(where("payments", "userId"), (ref) => update(ref, { userId: null }));
    await each(where("reviews", "userId"), (ref) => update(ref, { userId: null, userName: ANON }));
    await each(where("tournament_registrations", "userId"), (ref) => update(ref, { userId: null, userName: ANON }));
    await each(where("academy_enrollments", "userId"), (ref) => update(ref, { userId: null, userName: ANON, userEmail: FieldValue.delete() }));

    // Se borran
    await each(where("matchmaking", "userId"), (ref) => del(ref));
    await each(where("reports", "userId"), (ref) => del(ref));
    await each(where("mp_customers", "uid"), (ref) => del(ref));
    for (const field of ["senderId", "receiverId"]) {
      const snap = await where("challenges", field).get();
      for (const d of snap.docs) await db.recursiveDelete(d.ref);
    }

    // Equipos: se le quita del equipo y se borran sus mensajes; si era el único miembro, se borra el equipo
    const teams = await where("teams", "members", "array-contains").get();
    for (const t of teams.docs) {
      const team = t.data();
      const others: string[] = (team.members || []).filter((m: string) => m !== uid);
      if (!others.length) { await db.recursiveDelete(t.ref); continue; }
      const msgs = await t.ref.collection("messages").where("senderId", "==", uid).get();
      msgs.docs.forEach((m) => del(m.ref));
      update(t.ref, {
        members: FieldValue.arrayRemove(uid),
        [`membersMeta.${uid}`]: FieldValue.delete(),
        ...(team.ownerId === uid ? { ownerId: others[0] } : {}),
      });
    }
    await each(where("teams", "joinRequests", "array-contains"), (ref) => update(ref, { joinRequests: FieldValue.arrayRemove(uid) }));

    for (let i = 0; i < writes.length; i += 400) {
      const batch = db.batch();
      writes.slice(i, i + 400).forEach((w) => w(batch));
      await batch.commit();
    }
    await Promise.all([db.collection("users").doc(uid).delete(), db.collection("profiles").doc(uid).delete()]);
    await adminAuth().deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("account delete", e);
    return NextResponse.json({ error: "No se pudo eliminar la cuenta. Escríbenos a soporte@mvpsports.cl." }, { status: 500 });
  }
}
