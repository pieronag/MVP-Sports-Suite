import { postApi } from "@/services/client/apiClient";
import { IMAGE_MAX_BYTES, type ImageFolder } from "@/utils/images";

// Imágenes fuera de los documentos: se comprimen en el navegador y se suben a /api/images, que las guarda aparte
// y las sirve con caché larga. Los documentos (usuarios, equipos, recintos) guardan solo la URL, así las listas
// no descargan fotos. (El proyecto no tiene bucket de Storage: el plan Spark no lo incluye.)

export interface UploadImageOptions {
  folder: ImageFolder;
  maxSize?: number; // lado mayor en px
  quality?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));

// Redimensiona y comprime; si aún pesa demasiado, baja calidad y tamaño hasta caber
async function compress(source: File | Blob | string, maxSize: number, quality: number): Promise<Blob> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    let side = maxSize, q = quality;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, side / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = (await toBlob(canvas, "image/webp", q)) || (await toBlob(canvas, "image/jpeg", q));
      if (!blob) throw new Error("No se pudo comprimir la imagen");
      if (blob.size <= IMAGE_MAX_BYTES) return blob;
      side = Math.round(side * 0.75); q = Math.max(0.5, q - 0.1);
    }
    throw new Error("La imagen es demasiado pesada");
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result as string);
  r.onerror = () => reject(new Error("No se pudo leer la imagen"));
  r.readAsDataURL(blob);
});

// Acepta File/Blob o un data URL (p. ej. salida de un recorte) y devuelve la URL de la imagen
export async function uploadImage(source: File | Blob | string, { folder, maxSize = 1024, quality = 0.8 }: UploadImageOptions): Promise<string> {
  const blob = await compress(source, maxSize, quality);
  const { url } = await postApi<{ url: string }>("/api/images", { folder, data: await blobToDataUrl(blob) });
  return url;
}
