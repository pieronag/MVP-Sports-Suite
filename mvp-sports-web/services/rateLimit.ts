import "server-only";
import { adminDb } from "./firebase-admin";

// Límite de llamadas por clave en una ventana (un documento por clave, sin índices compuestos)
export async function allowRequest(key: string, maxCalls: number, windowMs: number): Promise<boolean> {
  const ref = adminDb().collection("rate_limits").doc(key.replace(/[\/#\[\]]/g, "_").slice(0, 500));
  return adminDb().runTransaction(async (tx) => {
    const now = Date.now();
    const hits: number[] = ((await tx.get(ref)).data()?.hits || []).filter((t: number) => now - t < windowMs);
    if (hits.length >= maxCalls) return false;
    tx.set(ref, { hits: [...hits, now], updatedAt: now });
    return true;
  });
}
