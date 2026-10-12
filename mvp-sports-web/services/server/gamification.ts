import "server-only";
import { adminDb } from "./firebase-admin";
import { computeProgress, normalizeSettings, type GamificationConfig } from "@/utils/gamificationCalc";

// Experiencia, nivel y logros solo los escribe el servidor (las reglas de Firestore los protegen).
// Se recalculan tras un check-in, una inasistencia, un partido interno y cada noche.

let settingsCache: { at: number; value: GamificationConfig } | null = null;
async function loadSettings(): Promise<GamificationConfig> {
  if (settingsCache && Date.now() - settingsCache.at < 10 * 60_000) return settingsCache.value;
  const value = normalizeSettings((await adminDb().collection("settings").doc("global").get()).data() || {});
  settingsCache = { at: Date.now(), value };
  return value;
}

export async function recomputePlayer(uid: string): Promise<{ xp: number } | null> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const [userSnap, own, joined, cfg] = await Promise.all([
    userRef.get(),
    db.collection("bookings").where("userId", "==", uid).get(),
    db.collection("bookings").where("participantIds", "array-contains", uid).get(),
    loadSettings(),
  ]);
  if (!userSnap.exists) return null;
  const user = userSnap.data() || {};
  // Se calcula para cualquier cuenta que juegue (dueños y personal también reservan como jugadores)

  const bookings = new Map<string, any>();
  [...own.docs, ...joined.docs].forEach((d) => bookings.set(d.id, d.data()));
  const progress = computeProgress(uid, user, [...bookings.values()], cfg);
  await userRef.update({ ...progress, lastStatsUpdate: new Date().toISOString() });
  return { xp: progress.xp };
}
