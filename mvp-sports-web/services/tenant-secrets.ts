import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

// Secretos de pasarelas y facturación. Viven en colecciones sin acceso desde
// el cliente (reglas: read/write false); solo el Admin SDK los lee.
export const TENANT_SECRET_KEYS = ["mercadopagoAccessToken", "siiApiKey"] as const;
export type TenantSecretKey = (typeof TENANT_SECRET_KEYS)[number];
export type TenantSecrets = Partial<Record<TenantSecretKey, string>>;

// Campos que antes se guardaban en tenants/{id} (lectura pública) y deben eliminarse
export const LEGACY_TENANT_SECRET_FIELDS = [...TENANT_SECRET_KEYS, "transbankApiKey"];

export async function getTenantSecrets(tenantId: string): Promise<TenantSecrets> {
  const db = adminDb();
  const snap = await db.collection("tenant_secrets").doc(tenantId).get();
  const secrets: TenantSecrets = (snap.data() as TenantSecrets) || {};
  if (secrets.mercadopagoAccessToken) return secrets;

  // Respaldo mientras corre la migración: leer el campo heredado
  const legacy = (await db.collection("tenants").doc(tenantId).get()).data() || {};
  return {
    mercadopagoAccessToken: secrets.mercadopagoAccessToken || legacy.mercadopagoAccessToken || undefined,
    siiApiKey: secrets.siiApiKey || legacy.siiApiKey || undefined,
  };
}

export async function setTenantSecrets(tenantId: string, values: TenantSecrets, updatedBy: string) {
  const db = adminDb();
  const clean: Record<string, unknown> = { updatedAt: new Date(), updatedBy };
  for (const k of TENANT_SECRET_KEYS) {
    const v = values[k];
    if (typeof v === "string") clean[k] = v.trim() ? v.trim() : FieldValue.delete();
  }
  await db.collection("tenant_secrets").doc(tenantId).set(clean, { merge: true });
  await scrubLegacyTenantSecrets(tenantId);
}

export async function scrubLegacyTenantSecrets(tenantId: string) {
  const del: Record<string, FieldValue> = {};
  for (const f of LEGACY_TENANT_SECRET_FIELDS) del[f] = FieldValue.delete();
  await adminDb().collection("tenants").doc(tenantId).update(del);
}

// Token de Mercado Pago de la plataforma (recintos sin cuenta propia)
export async function getPlatformMercadoPagoToken(): Promise<string | undefined> {
  const db = adminDb();
  const priv = (await db.collection("settings_private").doc("global").get()).data();
  if (priv?.mercadopagoAccessToken) return priv.mercadopagoAccessToken;
  return process.env.MERCADOPAGO_ACCESS_TOKEN
    || (await db.collection("settings").doc("global").get()).data()?.mercadopago?.accessToken
    || undefined;
}

// Token a usar para un recinto: el suyo o el de la plataforma
export async function resolveMercadoPagoToken(tenantId?: string | null): Promise<string | undefined> {
  if (tenantId && tenantId !== "system") {
    const { mercadopagoAccessToken } = await getTenantSecrets(tenantId);
    if (mercadopagoAccessToken) return mercadopagoAccessToken;
  }
  return getPlatformMercadoPagoToken();
}
