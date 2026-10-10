import "server-only";
import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";
import { PaymentError, SITE_URL } from "@/services/server/mercadopago";

// Inscripción de equipos a torneos (solo servidor): valida dueño del equipo,
// cupos y duplicados; el estado de pago nunca lo define el cliente.

export interface RegistrationDraft {
  regId: string;
  tournamentId: string;
  tenantId: string | null;
  teamId: string;
  teamName: string;
  teamLogo: string;
  userId: string;
  userName: string;
  price: number;
  title: string;
  returnUrl: string;
}

export async function buildRegistration(uid: string, tournamentId: string, teamId: string): Promise<RegistrationDraft> {
  if (!tournamentId || !teamId) throw new PaymentError("Datos de inscripción incompletos");
  const db = adminDb();
  const [tSnap, teamSnap, userSnap] = await Promise.all([
    db.collection("tournaments").doc(tournamentId).get(),
    db.collection("teams").doc(teamId).get(),
    db.collection("users").doc(uid).get(),
  ]);
  const t = tSnap.data();
  const team = teamSnap.data();
  if (!t) throw new PaymentError("Torneo no encontrado", 404);
  if (!team) throw new PaymentError("Equipo no encontrado", 404);
  if (team.ownerId !== uid) throw new PaymentError("Solo el capitán puede inscribir al equipo", 403);
  if (t.status === "finished") throw new PaymentError("El torneo ya terminó");
  if (t.isVisibleInApp === false) throw new PaymentError("El torneo no está disponible");
  if (t.registrationEndDate && new Date(`${t.registrationEndDate}T23:59:59-03:00`) < new Date()) {
    throw new PaymentError("Las inscripciones están cerradas");
  }
  const teams: any[] = t.teams || [];
  if (teams.some((x) => x.id === teamId)) throw new PaymentError("Tu equipo ya está inscrito", 409);
  if (t.maxTeams && teams.length >= Number(t.maxTeams)) throw new PaymentError("No quedan cupos", 409);

  const user = userSnap.data() || {};
  return {
    regId: `${tournamentId}_${teamId}`,
    tournamentId,
    tenantId: t.tenantId || null,
    teamId,
    teamName: team.name || "Equipo",
    teamLogo: team.imageUrl || team.logo || "",
    userId: uid,
    userName: user.displayName || user.fullName || "Jugador MVP",
    price: Math.max(0, Math.round(Number(t.price) || 0)),
    title: `Inscripción ${t.name || "torneo"} · ${team.name || "equipo"}`,
    returnUrl: `${SITE_URL}/player/torneos?registered=${encodeURIComponent(tournamentId)}`,
  };
}

// Escribe la inscripción y agrega el equipo al torneo (idempotente por regId).
// Todas las lecturas van antes de las escrituras (requisito de las transacciones).
export async function commitRegistration(
  tx: Transaction,
  draft: Omit<RegistrationDraft, "title" | "returnUrl">,
  payment: { paymentStatus: "paid" | "pending"; method: "mercadopago" | "venue"; paymentRecordId?: string },
) {
  const db = adminDb();
  const regRef = db.collection("tournament_registrations").doc(draft.regId);
  const tRef = db.collection("tournaments").doc(draft.tournamentId);
  const [reg, tSnap] = await Promise.all([tx.get(regRef), tx.get(tRef)]);
  const teams: any[] = tSnap.data()?.teams || [];
  const alreadyIn = teams.some((x) => x.id === draft.teamId);

  if (!reg.exists) {
    tx.set(regRef, {
      tournamentId: draft.tournamentId,
      tenantId: draft.tenantId,
      teamId: draft.teamId,
      teamName: draft.teamName,
      userId: draft.userId,
      userName: draft.userName,
      price: draft.price,
      paidAmount: payment.paymentStatus === "paid" ? draft.price : 0,
      status: "confirmed",
      paymentStatus: payment.paymentStatus,
      paymentMethod: payment.method,
      paymentRecordId: payment.paymentRecordId || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } else if (payment.paymentStatus === "paid") {
    tx.update(regRef, {
      paymentStatus: "paid",
      paidAmount: draft.price,
      paymentMethod: payment.method,
      paymentRecordId: payment.paymentRecordId || null,
    });
  }
  if (!alreadyIn && tSnap.exists) {
    tx.update(tRef, {
      teams: FieldValue.arrayUnion({
        id: draft.teamId,
        name: draft.teamName,
        logo: draft.teamLogo,
        userId: draft.userId,
        registeredAt: new Date().toISOString(),
      }),
      enrolledTeams: FieldValue.increment(1),
    });
  }
}
