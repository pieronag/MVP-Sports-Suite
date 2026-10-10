import { NextResponse } from "next/server";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller, getUserRole, SUPER_ADMIN_ROLES } from "@/services/server/server-auth";
import { getTenantSecrets, setTenantSecrets, TENANT_SECRET_KEYS, type TenantSecrets } from "@/services/server/tenant-secrets";

// Owner del recinto (ownerId/ownerIds) o superadmin. Los managers no gestionan credenciales.
async function canManageTenantSecrets(uid: string, tenantId: string) {
  const role = await getUserRole(uid);
  if (role && SUPER_ADMIN_ROLES.includes(role)) return true;
  if (role !== "owner") return false;
  const t = (await adminDb().collection("tenants").doc(tenantId).get()).data();
  if (!t) return false;
  const owners: string[] = t.ownerIds || (t.ownerId ? [t.ownerId] : []);
  return owners.includes(uid);
}

async function authorize(request: Request, tenantId: string | null) {
  if (!tenantId) return { error: NextResponse.json({ error: "tenantId requerido" }, { status: 400 }) };
  const caller = await verifyAuthedCaller(request);
  if (!caller) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  if (!(await canManageTenantSecrets(caller.uid, tenantId))) {
    return { error: NextResponse.json({ error: "Sin permisos sobre este recinto" }, { status: 403 }) };
  }
  return { caller };
}

// Devuelve solo qué credenciales están configuradas, nunca su valor
export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  const auth = await authorize(request, tenantId);
  if (auth.error) return auth.error;
  const secrets = await getTenantSecrets(tenantId!);
  const configured = Object.fromEntries(TENANT_SECRET_KEYS.map((k) => [k, !!secrets[k]]));
  return NextResponse.json({ configured });
}

// Guarda credenciales. Un string vacío borra la credencial; omitir la clave la conserva.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const tenantId: string | null = body?.tenantId || null;
  const auth = await authorize(request, tenantId);
  if (auth.error) return auth.error;

  const values: TenantSecrets = {};
  for (const k of TENANT_SECRET_KEYS) {
    if (typeof body[k] === "string") values[k] = body[k];
  }
  await setTenantSecrets(tenantId!, values, auth.caller!.uid);
  return NextResponse.json({ ok: true });
}
