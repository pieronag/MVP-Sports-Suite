import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

// Promedio y cantidad de reseñas del recinto, calculados en el servidor
export async function recomputeVenueRating(tenantId: string) {
  const db = adminDb();
  const snap = await db.collection("reviews").where("venueId", "==", tenantId).get();
  const ratings = snap.docs.map((d) => Number(d.data().rating) || 0).filter((r) => r >= 1 && r <= 5);
  const avg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
  await db.collection("tenants").doc(tenantId).update({ rating: avg, totalFeedbacks: ratings.length, ratingUpdatedAt: FieldValue.serverTimestamp() });
  return { avg, count: ratings.length };
}
