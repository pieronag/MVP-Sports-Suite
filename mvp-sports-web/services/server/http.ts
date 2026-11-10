import "server-only";

// Entrada de las rutas de la API: nunca confiar en la forma del cuerpo ni en los IDs que manda el cliente.

// Cuerpo JSON como objeto plano. JSON roto, null, texto, números o listas → {} (la ruta responde 400, no 500).
export async function readBody(request: Request): Promise<Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body : {};
}

// ID de documento de Firestore seguro: sin "/" ni rutas, largo acotado. Inválido → "" (la ruta lo trata como faltante).
export const docId = (v: unknown): string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v) ? v : "";
