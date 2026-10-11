import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "./firebase-admin";
import { passwordIssue } from "@/utils/password";
import { normalizeRole, isPlatformAdmin } from "@/utils/roles";

export class StaffError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface StaffInput { fullName?: string; email?: string; password?: string; passwordConfirm?: string; rut?: string; jobTitle?: string; phone?: string; tenantIds?: string[] }

// El que llama debe ser administrador o dueño de TODOS los recintos indicados
export async function assertManagesVenues(callerUid: string, tenantIds: string[]) {
  const db = adminDb();
  const caller = (await db.collection("users").doc(callerUid).get()).data() || {};
  const role = normalizeRole(caller.role);
  if (isPlatformAdmin(role)) return role;
  if (role !== "owner") throw new StaffError("Solo el dueño del recinto puede gestionar su personal.", 403);
  if (!tenantIds.length) throw new StaffError("Selecciona al menos un recinto.");
  const snaps = await Promise.all(tenantIds.map((id) => db.collection("tenants").doc(id).get()));
  const ownsAll = snaps.every((t) => { const d = t.data(); return !!d && (d.ownerId === callerUid || (d.ownerIds || []).includes(callerUid)); });
  if (!ownsAll) throw new StaffError("Solo puedes asignar personal a tus propios recintos.", 403);
  return role;
}

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const venuesOf = (d: FirebaseFirestore.DocumentData | undefined) =>
  [...new Set<string>([...(d?.tenantIds || []), d?.tenantId].filter(Boolean))];

export async function createStaff(callerUid: string, input: StaffInput) {
  const tenantIds = [...new Set((input.tenantIds || []).filter((x) => typeof x === "string" && x))];
  await assertManagesVenues(callerUid, tenantIds);
  const fullName = clean(input.fullName);
  const email = clean(input.email, 200).toLowerCase();
  if (fullName.length < 3) throw new StaffError("Escribe el nombre completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new StaffError("El correo no es válido.");
  const pw = passwordIssue(String(input.password || ""), String(input.passwordConfirm ?? input.password ?? ""));
  if (pw) throw new StaffError(pw);

  const auth = adminAuth();
  let uid: string;
  try {
    uid = (await auth.createUser({ email, password: String(input.password), displayName: fullName })).uid;
  } catch (e: any) {
    if (e?.code === "auth/email-already-exists") throw new StaffError("Ese correo ya tiene una cuenta en MVP Sports.", 409);
    if (e?.code === "auth/invalid-password") throw new StaffError("La contraseña no es válida.");
    throw e;
  }
  const db = adminDb();
  const profile = { fullName, rut: clean(input.rut, 20), jobTitle: clean(input.jobTitle, 60), phone: clean(input.phone, 30), tenantIds, tenantId: tenantIds[0] };
  try {
    await db.collection("users").doc(uid).set({ uid, email, ...profile, role: "manager", status: "active", createdBy: callerUid, createdAt: FieldValue.serverTimestamp() });
    const ref = await db.collection("staff").add({ uid, email, ...profile, role: "manager", status: "active", createdBy: callerUid, createdAt: FieldValue.serverTimestamp() });
    return { staffId: ref.id, uid };
  } catch (e) {
    await auth.deleteUser(uid).catch(() => undefined); // no dejar cuentas sin perfil
    throw e;
  }
}

async function loadStaff(callerUid: string, staffId: string) {
  const db = adminDb();
  const snap = await db.collection("staff").doc(staffId).get();
  const staff = snap.data();
  if (!staff) throw new StaffError("No existe ese miembro del personal.", 404);
  const target = staff.uid ? (await db.collection("users").doc(staff.uid).get()).data() : undefined;
  if (target && ["owner", "admin", "superadmin"].includes(normalizeRole(target.role))) throw new StaffError("No se puede modificar a un dueño o administrador desde aquí.", 403);
  await assertManagesVenues(callerUid, [...new Set([...venuesOf(staff), ...venuesOf(target)])]);
  return { ref: snap.ref, staff };
}

export async function updateStaff(callerUid: string, staffId: string, input: StaffInput & { status?: string }) {
  const { ref, staff } = await loadStaff(callerUid, staffId);
  const patch: Record<string, unknown> = {};
  if (input.fullName !== undefined) { const v = clean(input.fullName); if (v.length < 3) throw new StaffError("Escribe el nombre completo."); patch.fullName = v; }
  if (input.rut !== undefined) patch.rut = clean(input.rut, 20);
  if (input.jobTitle !== undefined) patch.jobTitle = clean(input.jobTitle, 60);
  if (input.phone !== undefined) patch.phone = clean(input.phone, 30);
  if (input.tenantIds !== undefined) {
    const ids = [...new Set(input.tenantIds.filter((x) => typeof x === "string" && x))];
    await assertManagesVenues(callerUid, ids); // los recintos nuevos también deben ser suyos
    patch.tenantIds = ids; patch.tenantId = ids[0];
  }
  if (input.status !== undefined) {
    if (!["active", "inactive"].includes(input.status)) throw new StaffError("Estado no válido.");
    patch.status = input.status;
  }
  if (!Object.keys(patch).length) return;
  const db = adminDb();
  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  if (staff.uid) {
    await db.collection("users").doc(staff.uid).set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (patch.fullName) await adminAuth().updateUser(staff.uid, { displayName: String(patch.fullName) }).catch(() => undefined);
    // Suspender bloquea de verdad el acceso: cuenta deshabilitada y sesiones cerradas
    if (patch.status) {
      await adminAuth().updateUser(staff.uid, { disabled: patch.status === "inactive" });
      if (patch.status === "inactive") await adminAuth().revokeRefreshTokens(staff.uid);
    }
  }
}

export async function deleteStaff(callerUid: string, staffId: string) {
  const { ref, staff } = await loadStaff(callerUid, staffId);
  if (staff.uid) {
    await adminAuth().deleteUser(staff.uid).catch((e: any) => { if (e?.code !== "auth/user-not-found") throw e; });
    await adminDb().collection("users").doc(staff.uid).delete();
  }
  await ref.delete();
}
