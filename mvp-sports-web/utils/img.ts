import type { SyntheticEvent } from "react";

// Foto remota que no carga (foto de Google vencida o limitada, enlace roto): se oculta en vez de mostrar
// el ícono de imagen rota; el contenedor conserva su fondo y su tamaño.
export const hideBrokenImg = (e: SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.visibility = "hidden"; };
