"use client";
import { useEffect, useState } from "react";

// Hora actual que se actualiza sola cada `intervalMs`. Para ventanas de tiempo en pantalla
// (ticket visible, check-in habilitado, partido jugado): leer Date.now() durante el render
// deja la hora congelada hasta el próximo render y React lo marca como impuro.
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
