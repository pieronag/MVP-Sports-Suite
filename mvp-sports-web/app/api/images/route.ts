import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/services/server/firebase-admin";
import { verifyAuthedCaller } from "@/services/server/server-auth";
import { allowRequest } from "@/services/server/rateLimit";
import { readBody } from "@/services/server/http";
import { IMAGE_FOLDERS, IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/utils/images";

// Subida de imágenes (fotos de perfil, escudos, canchas, torneos, portadas de recintos).
// El proyecto está en el plan Spark, sin bucket de Storage: cada imagen (ya comprimida en el navegador) se guarda
// como bytes en su propio documento de la colección `images` (solo Admin SDK) y se sirve desde /api/images/<id>
// con caché larga. Los documentos de usuarios, equipos y recintos guardan solo esa URL, no la foto.
export async function POST(request: Request) {
  const caller = await verifyAuthedCaller(request);
  if (!caller) return NextResponse.json({ error: "Inicia sesión para subir imágenes." }, { status: 401 });
  if (!(await allowRequest(`image_upload_${caller.uid}`, 30, 10 * 60_000))) return NextResponse.json({ error: "Demasiadas imágenes seguidas. Intenta en unos minutos." }, { status: 429 });

  const body = await readBody(request);
  const folder = String(body.folder || "");
  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ""));
  if (!(IMAGE_FOLDERS as readonly string[]).includes(folder)) return NextResponse.json({ error: "Destino de imagen no válido." }, { status: 400 });
  if (!match || !(IMAGE_TYPES as readonly string[]).includes(match[1])) return NextResponse.json({ error: "Formato de imagen no válido (usa JPG, PNG o WebP)." }, { status: 400 });

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) return NextResponse.json({ error: "La imagen está vacía." }, { status: 400 });
  if (bytes.length > IMAGE_MAX_BYTES) return NextResponse.json({ error: "La imagen es demasiado pesada." }, { status: 413 });

  const ref = adminDb().collection("images").doc();
  await ref.set({ owner: caller.uid, folder, type: match[1], size: bytes.length, data: bytes, createdAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ id: ref.id, url: `/api/images/${ref.id}` });
}
