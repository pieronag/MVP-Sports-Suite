// Validación de un torneo antes de publicarlo (las fechas son AAAA-MM-DD; las horas HH:MM)
export function tournamentIssue(f: any): string | null {
  if (!String(f?.name || "").trim() || String(f.name).trim().length < 3) return "Ponle un nombre al torneo (mínimo 3 letras)";
  if (!f.sport) return "Elige el deporte";
  if (!f.tenantId) return "Elige el recinto donde se juega";
  const max = Number(f.maxTeams);
  if (!Number.isFinite(max) || max < 2) return "El torneo necesita al menos 2 equipos";
  const price = Number(f.price);
  if (!Number.isFinite(price) || price < 0) return "La inscripción no puede ser negativa";
  if (!f.tournamentStartDate) return "Indica la fecha de inicio del torneo";
  if (f.tournamentEndDate && f.tournamentEndDate < f.tournamentStartDate) return "El torneo no puede terminar antes de empezar";
  if (f.registrationStartDate && f.registrationEndDate && f.registrationEndDate < f.registrationStartDate) return "Las inscripciones no pueden cerrar antes de abrir";
  if (f.registrationEndDate && f.registrationEndDate > f.tournamentStartDate) return "Las inscripciones deben cerrar antes de que empiece el torneo";
  if (f.startTime && f.endTime && f.endTime <= f.startTime) return "La hora de término debe ser posterior a la de inicio";
  return null;
}

// Estado de las inscripciones según el día calendario en Chile (las fechas del torneo son AAAA-MM-DD)
export function registrationState(t: any, now: Date = new Date()): "not_open" | "open" | "closed" {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(now);
  if (t?.status === "finished" || t?.status === "completed") return "closed";
  if (t?.registrationEndDate && today > t.registrationEndDate) return "closed";
  if (t?.registrationStartDate && today < t.registrationStartDate) return "not_open";
  return "open";
}
