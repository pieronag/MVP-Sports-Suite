import { NextResponse } from "next/server";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { adminAuth, adminDb } from "@/services/server/firebase-admin";
import { allowRequest } from "@/services/server/rateLimit";

// Elimina a un miembro del personal: su acceso (Firebase Auth), su perfil y su ficha.
// Solo el dueño de todos sus recintos (o un administrador) puede hacerlo.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  if (!(await allowRequest(`staff_delete_${caller.uid}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intenta en un minuto." }, { status: 429 });
  }
  const { staffId } = await request.json().catch(() => ({}));
  if (typeof staffId !== "string" || !/^[A-Za-z0-9_-]{6,128}$/.test(staffId)) {
    return NextResponse.json({ error: "Personal no indicado." }, { status: 400 });
  }

  const db = adminDb();
  const [callerSnap, staffSnap] = await Promise.all([db.collection("users").doc(caller.uid).get(), db.collection("staff").doc(staffId).get()]);
  const staff = staffSnap.data();
  if (!staff) return NextResponse.json({ error: "No existe ese miembro del personal." }, { status: 404 });

  const role = String(callerSnap.data()?.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";
  const targetUid: string | undefined = staff.uid;
  const targetSnap = targetUid ? await db.collection("users").doc(targetUid).get() : null;
  const target = targetSnap?.data() || {};
  const tenantIds: string[] = [...new Set<string>([...(staff.tenantIds || []), ...(target.tenantIds || []), staff.tenantId, target.tenantId].filter(Boolean))];

  if (!isAdmin) {
    if (role !== "owner") return NextResponse.json({ error: "Solo el dueño puede eliminar personal." }, { status: 403 });
    const tenants = await Promise.all(tenantIds.map((id) => db.collection("tenants").doc(id).get()));
    const ownsAll = tenants.length > 0 && tenants.every((t) => {
      const d = t.data() || {};
      return d.ownerId === caller.uid || (d.ownerIds || []).includes(caller.uid);
    });
    if (!ownsAll) return NextResponse.json({ error: "Ese miembro del personal no es de tus recintos." }, { status: 403 });
  }
  if (targetUid && ["owner", "admin", "superadmin"].includes(String(target.role || "").toLowerCase())) {
    return NextResponse.json({ error: "No se puede eliminar a un dueño o administrador desde aquí." }, { status: 403 });
  }

  if (targetUid) {
    await adminAuth().deleteUser(targetUid).catch((e: any) => { if (e?.code !== "auth/user-not-found") throw e; });
    await db.collection("users").doc(targetUid).delete();
  }
  await staffSnap.ref.delete();
  return NextResponse.json({ ok: true });
}
