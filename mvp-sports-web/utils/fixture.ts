// Fixture de torneos: liga (todos contra todos), eliminación directa y grupos; y tabla de posiciones.
// Lógica pura (sin Firebase), probada en tests/fixture.test.ts.

export interface FixtureTeam { id: string; name: string }
export interface FixtureMatch {
  id: string;
  team1_id: string; team1_name: string;
  team2_id: string; team2_name: string;
  score1: number | null; score2: number | null;
  status: "pending" | "finished";
  round: number;
  stage?: string;
  group?: string;
}
export interface Standing { id: string; name: string; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; pts: number }

const BYE: FixtureTeam = { id: "bye", name: "Descanso" };
const newId = () => Math.random().toString(36).slice(2, 11);

export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function stageName(totalRounds: number, round: number): string {
  const diff = totalRounds - round;
  if (diff === 0) return "Final";
  if (diff === 1) return "Semifinal";
  if (diff === 2) return "Cuartos de Final";
  if (diff === 3) return "Octavos de Final";
  return `Ronda ${round}`;
}

// Liga: método del círculo. Con número impar, cada fecha un equipo descansa (no se genera partido).
export function roundRobin(teams: FixtureTeam[], group?: string): { matches: FixtureMatch[]; totalRounds: number } {
  const list = teams.length % 2 ? [...teams, BYE] : [...teams];
  const n = list.length;
  const rounds = Math.max(0, n - 1);
  const matches: FixtureMatch[] = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a.id === BYE.id || b.id === BYE.id) continue;
      matches.push({ id: newId(), team1_id: a.id, team1_name: a.name, team2_id: b.id, team2_name: b.name, score1: null, score2: null, status: "pending", round: r + 1, ...(group ? { group } : {}) });
    }
    list.splice(1, 0, list.pop()!);
  }
  return { matches, totalRounds: rounds };
}

// Eliminación directa: cuadro de potencia de 2; cada descanso le toca a un equipo real (que avanza),
// nunca "descanso contra descanso". Antes los descansos quedaban juntos al final del cuadro.
export function knockout(teams: FixtureTeam[]): { matches: FixtureMatch[]; totalRounds: number } {
  if (teams.length < 2) return { matches: [], totalRounds: 0 };
  const rounds = Math.ceil(Math.log2(teams.length));
  const size = 2 ** rounds;
  const byes = size - teams.length;
  const matches: FixtureMatch[] = [];
  let k = 0;
  for (let i = 0; i < size / 2; i++) {
    const a = teams[k++];
    const b = i < byes ? BYE : teams[k++];
    const bye = b.id === BYE.id;
    matches.push({
      id: newId(), team1_id: a.id, team1_name: a.name, team2_id: b.id, team2_name: b.name,
      score1: bye ? 1 : null, score2: bye ? 0 : null, status: bye ? "finished" : "pending",
      round: 1, stage: stageName(rounds, 1),
    });
  }
  return { matches, totalRounds: rounds };
}

// Grupos: de 4 equipos (el último puede quedar de 3 a 5), todos contra todos dentro de cada grupo.
// Antes solo se usaban los primeros 4 inscritos y el resto quedaba fuera del fixture.
export function groups(teams: FixtureTeam[], size = 4): { matches: FixtureMatch[]; totalRounds: number; groups: { name: string; teams: FixtureTeam[] }[] } {
  const count = Math.max(1, Math.round(teams.length / size));
  const buckets: FixtureTeam[][] = Array.from({ length: count }, () => []);
  teams.forEach((t, i) => buckets[i % count].push(t)); // reparto alternado: grupos parejos
  const out = buckets.map((b, i) => ({ name: `Grupo ${String.fromCharCode(65 + i)}`, teams: b }));
  let totalRounds = 0;
  const matches = out.flatMap((g) => { const r = roundRobin(g.teams, g.name); totalRounds = Math.max(totalRounds, r.totalRounds); return r.matches; });
  return { matches, totalRounds, groups: out };
}

export function generateFixture(type: string, teams: FixtureTeam[]) {
  if (type === "liga") return roundRobin(teams);
  if (type === "eliminacion") return knockout(teams);
  return groups(teams);
}

// Tabla: 3 puntos por triunfo, 1 por empate; desempate por diferencia y luego goles a favor.
// Por id de equipo (antes por nombre: dos equipos con el mismo nombre se sumaban como uno).
export function standings(matches: FixtureMatch[]): Standing[] {
  const table = new Map<string, Standing>();
  const row = (id: string, name: string) => {
    if (!table.has(id)) table.set(id, { id, name, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 });
    return table.get(id)!;
  };
  for (const m of matches || []) {
    if (m.status !== "finished" || m.score1 == null || m.score2 == null) continue;
    if (m.team1_id === BYE.id || m.team2_id === BYE.id) continue;
    const a = row(m.team1_id || m.team1_name, m.team1_name), b = row(m.team2_id || m.team2_name, m.team2_name);
    a.pj++; b.pj++;
    a.gf += m.score1; a.gc += m.score2; b.gf += m.score2; b.gc += m.score1;
    if (m.score1 > m.score2) { a.pg++; a.pts += 3; b.pp++; }
    else if (m.score2 > m.score1) { b.pg++; b.pts += 3; a.pp++; }
    else { a.pe++; b.pe++; a.pts++; b.pts++; }
  }
  return [...table.values()].sort((x, y) => (y.pts - x.pts) || ((y.gf - y.gc) - (x.gf - x.gc)) || (y.gf - x.gf));
}
