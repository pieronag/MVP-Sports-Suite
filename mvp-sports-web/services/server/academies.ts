import "server-only";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { chileToday } from "@/utils/chileTime";
import { adminDb } from "@/services/server/firebase-admin";
import { PaymentError, SITE_URL } from "@/services/server/mercadopago";

// Inscripción de jugadores a clases de academia (solo servidor).

export interface EnrollmentDraft {
  enrollmentId: string;
  classId: string;
  tenantId: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  price: number;
  title: string;
  returnUrl: string;
}

// Las clases guardan ownerId; el recinto se resuelve por tenantId (si existe) o por el dueño
async function resolveTenantId(c: any): Promise<string | null> {
  if (c.tenantId) return c.tenantId;
  if (!c.ownerId) return null;
  const db = adminDb();
  const byOwner = await db.collection("tenants").where("ownerId", "==", c.ownerId).limit(1).get();
  if (!byOwner.empty) return byOwner.docs[0].id;
  const byOwners = await db.collection("tenants").where("ownerIds", "array-contains", c.ownerId).limit(1).get();
  return byOwners.empty ? null : byOwners.docs[0].id;
}

export async function buildEnrollment(uid: string, classId: string): Promise<EnrollmentDraft> {
  if (!classId) throw new PaymentError("Clase no indicada");
  const db = adminDb();
  const enrollmentId = `${classId}_${uid}`;
  const [cSnap, uSnap, eSnap] = await Promise.all([
    db.collection("academy_classes").doc(classId).get(),
    db.collection("users").doc(uid).get(),
    db.collection("academy_enrollments").doc(enrollmentId).get(),
  ]);
  const c = cSnap.data();
  if (!c) throw new PaymentError("Clase no encontrada", 404);
  if (c.status && c.status !== "active") throw new PaymentError("La clase no está recibiendo alumnos");
  if (c.isVisibleInApp === false) throw new PaymentError("La clase no está disponible");
  if (eSnap.exists && eSnap.data()?.status !== "cancelled") throw new PaymentError("Ya estás inscrito en esta clase", 409);
  if (c.maxStudents && Number(c.enrolledStudents || 0) >= Number(c.maxStudents)) throw new PaymentError("No quedan cupos", 409);
  if (c.endDate && chileToday() > String(c.endDate)) throw new PaymentError("La clase ya terminó");

  const u = uSnap.data() || {};
  return {
    enrollmentId,
    classId,
    tenantId: await resolveTenantId(c),
    userId: uid,
    userName: u.displayName || u.fullName || "Jugador MVP",
    userEmail: u.email || "",
    price: Math.max(0, Math.round(Number(c.price) || 0)),
    title: `Academia: ${c.name || "clase"}`,
    returnUrl: `${SITE_URL}/player/academias?enrolled=${encodeURIComponent(classId)}`,
  };
}

// Crea/actualiza la inscripción y descuenta el cupo (idempotente). Lecturas antes que escrituras.
export async function commitEnrollment(
  tx: Transaction,
  draft: Omit<EnrollmentDraft, "title" | "returnUrl">,
  payment: { paymentStatus: "paid" | "pending"; method: "mercadopago" | "free"; paymentRecordId?: string },
  // Con un pago ya aprobado se inscribe aunque el cupo se haya llenado entretanto
  // (mejor un alumno extra que un cobro sin inscripción).
  enforceCapacity = true,
) {
  const db = adminDb();
  const eRef = db.collection("academy_enrollments").doc(draft.enrollmentId);
  const cRef = db.collection("academy_classes").doc(draft.classId);
  const [e, c] = await Promise.all([tx.get(eRef), tx.get(cRef)]);
  const isNew = !e.exists || e.data()?.status === "cancelled";
  if (isNew) {
    const cls = c.data() || {};
    if (enforceCapacity && cls.maxStudents && Number(cls.enrolledStudents || 0) >= Number(cls.maxStudents)) {
      throw new PaymentError("No quedan cupos", 409);
    }
    tx.set(eRef, {
      classId: draft.classId,
      className: cls.name || "",
      tenantId: draft.tenantId,
      ownerId: cls.ownerId || null,
      userId: draft.userId,
      userName: draft.userName,
      userEmail: draft.userEmail,
      price: draft.price,
      status: "active",
      paymentStatus: payment.paymentStatus,
      paymentMethod: payment.method,
      paymentRecordId: payment.paymentRecordId || null,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (c.exists) tx.update(cRef, { enrolledStudents: FieldValue.increment(1) });
  } else if (payment.paymentStatus === "paid") {
    tx.update(eRef, { paymentStatus: "paid", paymentMethod: payment.method, paymentRecordId: payment.paymentRecordId || null });
  }
}
