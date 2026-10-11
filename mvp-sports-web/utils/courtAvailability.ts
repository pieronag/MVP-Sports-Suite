// Una cancha en mantenimiento solo se bloquea dentro de su ventana (sin ventana: bloqueada hasta reactivarla).
const ms = (v: any): number | null => (v?.toMillis ? v.toMillis() : v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : null);

export function courtBlockedAt(court: any, slotStart: number, slotEnd: number): boolean {
  if (court?.status === "occupied") return true;
  if (court?.status !== "maintenance") return false;
  const from = ms(court.maintenanceStart);
  const until = ms(court.maintenanceUntil);
  if (from === null && until === null) return true;
  return (from === null || slotEnd > from) && (until === null || slotStart < until);
}
