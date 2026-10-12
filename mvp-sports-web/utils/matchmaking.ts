// Validación de publicaciones en Partidos (equipo que busca rival o jugador disponible)

export function teamPostIssue(p: { teamId?: string; sport?: string; region?: string; communes?: string[] }): string | null {
  if (!p.teamId) return "Elige el equipo que quieres publicar.";
  if (!p.sport) return "Elige el deporte.";
  if (!p.region) return "Elige la región donde juegan.";
  if (!p.communes?.length) return "Marca al menos una comuna.";
  return null;
}

export function playerPostIssue(p: { sports?: string[]; region?: string; communes?: string[] }): string | null {
  if (!p.sports?.length) return "Elige al menos un deporte.";
  if (!p.region) return "Elige la región donde juegas.";
  if (!p.communes?.length) return "Marca al menos una comuna.";
  return null;
}
