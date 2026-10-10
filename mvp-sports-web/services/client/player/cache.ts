// Caché en memoria con expiración para lecturas repetidas del área Jugador.
// En plan Spark cada lectura cuenta: navegar entre pantallas no debe volver a leer lo mismo.
const store = new Map<string, { at: number; value: Promise<any> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = load().catch((e) => { store.delete(key); throw e; });
  store.set(key, { at: Date.now(), value });
  return value;
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
