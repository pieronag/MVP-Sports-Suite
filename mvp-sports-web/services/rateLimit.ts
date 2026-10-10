import "server-only";
import { adminDb } from "./firebase-admin";

// Límite de llamadas por clave en una ventana (un documento por clave, sin índices).
// Lectura + escritura simples: una carrera puntual deja pasar una llamada extra, aceptable aquí.
export async function allowRequest(key: string, maxCalls: number, windowMs: number): Promise<boolean> {
  const ref = adminDb().collection("rate_limits").doc(key.replace(/[\/#\[\]]/g, "_").slice(0, 500));
  const now = Date.now();
  const hits: number[] = ((await ref.get()).data()?.hits || []).filter((t: number) => now - t < windowMs);
  if (hits.length >= maxCalls) return false;
  await ref.set({ hits: [...hits, now], updatedAt: now });
  return true;
}
