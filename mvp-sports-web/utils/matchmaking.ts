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

export const MATCH_SPORTS = ["Fútbol", "Pádel", "Tenis", "Básquetbol", "Vóleibol", "Futbolito"];
export const POSITIONS_BY_SPORT: Record<string, string[]> = {
  "Fútbol": ["Arquero", "Defensa", "Lateral", "Volante", "Delantero"],
  "Futbolito": ["Arquero", "Defensa", "Lateral", "Volante", "Delantero"],
  "Pádel": ["Lado Derecho", "Lado Izquierdo"],
  "Tenis": ["Individual", "Dobles"],
  "Básquetbol": ["Base", "Escolta", "Alero", "Ala-Pívot", "Pívot"],
  "Vóleibol": ["Armador", "Atacante", "Central", "Líbero"],
};

const fold = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** El deporte canónico de la lista (sin importar tildes ni mayúsculas), o undefined. */
export const matchSport = (v: unknown) => MATCH_SPORTS.find((s) => fold(s) === fold(v));

type Zoned = { region?: string; commune?: string; communes?: string[] };
/** ¿La publicación juega en la zona elegida? Sin región = todo Chile; sin comunas = toda la región. */
export function inZone(e: Zoned, region: string, communes: string[]) {
  if (region && !(e.region || "").includes(region)) return false;
  if (!communes.length) return true;
  const own = e.communes?.length ? e.communes : e.commune ? [e.commune] : [];
  return own.some((c) => communes.includes(c));
}

/** Un paso para ampliar una búsqueda sin resultados: primero las comunas, luego la región, luego el deporte. */
export function widenSearch(f: { sport: string; region: string; communes: string[] }) {
  if (f.communes.length) return { next: { ...f, communes: [] }, label: "Buscar en toda la región" };
  if (f.region) return { next: { ...f, region: "" }, label: "Buscar en todo Chile" };
  if (f.sport) return { next: { ...f, sport: "" }, label: "Ver todos los deportes" };
  return null;
}

type ChallengeLike = {
  type: "team_vs_team" | "captain_to_player"; status: string; senderId: string; receiverId: string;
  challengerTeamName?: string; challengedTeamName?: string; challengerTeamId?: string; challengedTeamId?: string;
  captainName?: string; playerName?: string;
};
/** Del reto, lo que ve este usuario: el otro lado, su equipo y si le toca responder. */
export function challengeView(c: ChallengeLike, uid: string) {
  const isReceiver = c.receiverId === uid;
  const team = c.type === "team_vs_team";
  return {
    title: team ? `vs ${(isReceiver ? c.challengerTeamName : c.challengedTeamName) || "Equipo"}` : `Chat con ${(isReceiver ? c.captainName : c.playerName) || "Jugador"}`,
    otherTeamId: team ? (isReceiver ? c.challengerTeamId : c.challengedTeamId) : undefined,
    mustAnswer: isReceiver && c.status === "pending",
    status: ({ active: "Activo", pending: isReceiver ? "Te retaron" : "Esperando respuesta", declined: "Rechazado", closed: "Cerrado" } as Record<string, string>)[c.status] || "Cerrado",
  };
}

export function editEntryIssue(e: { type: string; sports?: string[]; description?: string }): string | null {
  if (e.type === "player" && !e.sports?.length) return "Elige al menos un deporte.";
  if ((e.description || "").length > 200) return "La descripción admite hasta 200 caracteres.";
  return null;
}
