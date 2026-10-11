// Nombre único de cada deporte (la base tenía "Padel"/"Pádel", "futbol"/"Fútbol", "voleibol"…)
export const SPORTS = ["Fútbol", "Futbolito", "Pádel", "Tenis", "Básquetbol", "Vóleibol"] as const;
export type Sport = (typeof SPORTS)[number];

const key = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");

const ALIASES: Record<string, Sport> = {
  futbol: "Fútbol", football: "Fútbol", soccer: "Fútbol", futbol11: "Fútbol",
  futbolito: "Futbolito", baby: "Futbolito", babyfutbol: "Futbolito", futsal: "Futbolito", futbol7: "Futbolito", futbol5: "Futbolito",
  padel: "Pádel", paddle: "Pádel",
  tenis: "Tenis", tennis: "Tenis",
  basquetbol: "Básquetbol", basketball: "Básquetbol", basquet: "Básquetbol", basket: "Básquetbol",
  voleibol: "Vóleibol", volleyball: "Vóleibol", voley: "Vóleibol", volley: "Vóleibol",
};

// Devuelve el nombre oficial, o el texto original limpio si no es un deporte conocido
export function canonicalSport(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return ALIASES[key(s)] || s;
}

export const sameSport = (a: unknown, b: unknown) => !!a && !!b && canonicalSport(a) === canonicalSport(b);
