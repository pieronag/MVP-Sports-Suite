// Reglas comunes de las imágenes subidas (navegador y servidor)
export const IMAGE_FOLDERS = ["avatars", "teams", "courts", "tournaments", "venues"] as const;
export type ImageFolder = (typeof IMAGE_FOLDERS)[number];
export const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
/** Un documento de Firestore admite 1 MiB: la imagen comprimida no pasa de 700 KB */
export const IMAGE_MAX_BYTES = 700 * 1024;
