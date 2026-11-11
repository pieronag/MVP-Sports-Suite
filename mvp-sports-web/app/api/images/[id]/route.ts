import { adminDb } from "@/services/server/firebase-admin";
import { docId } from "@/services/server/http";

// Entrega una imagen subida con /api/images. Las imágenes no cambian (una foto nueva es un documento nuevo),
// así que el navegador y la CDN de Vercel la guardan un año y Firestore se lee una sola vez por imagen.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = docId((await params).id);
  if (!id) return new Response("No encontrada", { status: 404 });
  const snap = await adminDb().collection("images").doc(id).get();
  const data = snap.data();
  if (!data?.data) return new Response("No encontrada", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
  const bytes = Buffer.from(data.data as Uint8Array);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": String(data.type || "image/jpeg"),
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
