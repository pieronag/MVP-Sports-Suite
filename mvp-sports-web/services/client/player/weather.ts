import { cached } from "@/services/client/player/cache";

// Pronóstico por hora para el lugar y momento del partido (Open-Meteo: gratis, sin clave, hasta 16 días)
export interface MatchWeather { temp: number; rainChance: number; label: string; icon: "sun" | "cloud" | "rain" | "storm" | "fog" | "snow" }

const describe = (code: number): Pick<MatchWeather, "label" | "icon"> => {
  if (code === 0) return { label: "Despejado", icon: "sun" };
  if (code <= 3) return { label: "Parcial nublado", icon: "cloud" };
  if (code <= 48) return { label: "Neblina", icon: "fog" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: "Lluvia", icon: "rain" };
  if (code <= 77 || code === 85 || code === 86) return { label: "Nieve", icon: "snow" };
  return { label: "Tormenta", icon: "storm" };
};

export async function getMatchWeather(lat: number, lng: number, start: Date): Promise<MatchWeather | null> {
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const days = (start.getTime() - Date.now()) / 86_400_000;
  if (days > 15 || days < -0.1) return null;
  const key = `weather:${lat.toFixed(2)},${lng.toFixed(2)}`;
  const data = await cached(key, 30 * 60_000, async () => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation_probability,weather_code&timezone=America%2FSantiago&forecast_days=16`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("clima");
    return r.json();
  }).catch(() => null);
  if (!data?.hourly?.time) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const target = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:00`;
  const i = data.hourly.time.indexOf(target);
  if (i < 0) return null;
  return {
    temp: Math.round(data.hourly.temperature_2m[i]),
    rainChance: Math.round(data.hourly.precipitation_probability?.[i] ?? 0),
    ...describe(Number(data.hourly.weather_code[i])),
  };
}
