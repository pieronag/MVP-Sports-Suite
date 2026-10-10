import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "@/services/client/firebase";

// Imágenes a Firebase Storage en vez de base64 dentro de Firestore: los documentos
// quedan livianos (las listas no descargan fotos) y el CDN de Storage las cachea.

export interface UploadImageOptions {
  folder: "avatars" | "teams" | "courts" | "tournaments" | "venues";
  maxSize?: number; // lado mayor en px
  quality?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function compress(source: File | Blob | string, maxSize: number, quality: number): Promise<Blob> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (blob) return blob;
    return await new Promise<Blob>((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("No se pudo comprimir"))), "image/jpeg", quality));
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

// Acepta File/Blob o un data URL (p. ej. salida de un recorte) y devuelve la URL pública
export async function uploadImage(source: File | Blob | string, { folder, maxSize = 1024, quality = 0.8 }: UploadImageOptions): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Inicia sesión para subir imágenes");
  const blob = await compress(source, maxSize, quality);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `images/${uid}/${folder}/${Date.now()}.${ext}`;
  const snap = await uploadBytes(ref(storage, path), blob, {
    contentType: blob.type,
    cacheControl: "public, max-age=31536000, immutable",
  });
  return getDownloadURL(snap.ref);
}
