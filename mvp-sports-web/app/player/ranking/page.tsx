"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/services/firebase";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { cached } from "@/services/player/cache";
import { gamificationService } from "@/services/player/gamificationService";
import { SegmentedTabs } from "@/components/player/ui";
import { ChevronLeft, Ranking, Crown } from "@/components/player/icons";

interface Row { uid: string; name: string; photo?: string; xp: number; city?: string }

// Nombre corto para mostrar a otros jugadores: nombre + inicial del apellido
const shortName = (n: string) => {
  const parts = String(n || "Jugador").trim().split(/\s+/);
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  return parts[1] ? `${first} ${parts[1].charAt(0).toUpperCase()}.` : first;
};

async function loadTop(city?: string): Promise<Row[]> {
  const base = collection(db, "users");
  const q = city
    ? query(base, where("role", "==", "player"), where("city", "==", city), orderBy("xp", "desc"), limit(50))
    : query(base, where("role", "==", "player"), orderBy("xp", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const u: any = d.data();
    return { uid: d.id, name: shortName(u.displayName || u.fullName), photo: u.photoURL, xp: Number(u.xp) || 0, city: u.city };
  });
}

export default function RankingPage() {
  const router = useRouter();
  const { profile, theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const city = (profile as any)?.city as string | undefined;
  const [scope, setScope] = useState<"city" | "all" | "season">(city ? "city" : "all");
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (city && !touched) setScope("city"); }, [city, touched]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [gamification, setGamification] = useState<any>(null);

  useEffect(() => { gamificationService.getSettings().then(setGamification); }, []);
  const [season, setSeason] = useState<{ label: string; endsInDays: number } | null>(null);
  useEffect(() => {
    setRows(null); setError(false);
    if (scope === "season") {
      cached("ranking:season", 30 * 60_000, () => fetch("/api/season").then((r) => { if (!r.ok) throw new Error(); return r.json(); }))
        .then((d: any) => { setSeason({ label: d.label, endsInDays: d.endsInDays }); setRows(d.rows.map((r: any) => ({ ...r, xp: r.matches }))); })
        .catch(() => { setError(true); setRows([]); });
      return;
    }
    const c = scope === "city" ? city : undefined;
    cached(`ranking:${c || "all"}`, 10 * 60_000, () => loadTop(c)).then(setRows).catch(() => { setError(true); setRows([]); });
  }, [scope, city]);

  const myIndex = useMemo(() => rows?.findIndex((r) => r.uid === user?.uid) ?? -1, [rows, user?.uid]);
  const sub = isDark ? "text-slate-400" : "text-slate-500";
  const card = isDark ? "bg-[#0A101D] border border-white/[0.06]" : "bg-white border border-slate-200";
  const medal = ["#f59e0b", "#94a3b8", "#cd7f32"];

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-3 flex items-center gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[15px] tracking-tight uppercase flex-1 text-center">Ranking</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 space-y-4 pb-6">
        <SegmentedTabs isDark={isDark} value={scope} onChange={(v) => { setTouched(true); setScope(v); }} options={[
          ...(city ? [{ id: "city" as const, label: city }] : []),
          { id: "all" as const, label: "Todo Chile" },
          { id: "season" as const, label: "Temporada" },
        ]} />
        {scope === "season" && season && (
          <p className={`text-[12px] ${sub}`}>Temporada {season.label} · termina en {season.endsInDays} día{season.endsInDays === 1 ? "" : "s"}. Gana quien juegue más partidos.</p>
        )}

        {myIndex >= 0 && (
          <div className="rounded-md p-4 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-emerald-500">Vas #{myIndex + 1}{scope === "season" ? " en la temporada" : scope === "city" && city ? ` en ${city}` : " en Chile"}</p>
            {myIndex > 0 && rows && <p className={`text-[12px] ${sub}`}>{(rows[myIndex - 1].xp - rows[myIndex].xp).toLocaleString("es-CL")} {scope === "season" ? "partidos" : "XP"} para subir un puesto</p>}
          </div>
        )}

        {rows === null ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center">
            <Ranking size={32} className={isDark ? "text-slate-600" : "text-slate-300"} />
            <p className={`text-[13px] mt-3 ${sub}`}>{error ? "No pudimos cargar el ranking. Intenta más tarde." : "Aún no hay jugadores en este ranking."}</p>
          </div>
        ) : (
          <ol className={`rounded-md ${card} divide-y ${isDark ? "divide-white/[0.06]" : "divide-slate-100"}`}>
            {rows.map((r, i) => {
              const me = r.uid === user?.uid;
              const tier = scope === "season" ? (r.city || "") : gamification ? gamificationService.calculateTier(r.xp, gamification).name : "";
              return (
                <li key={r.uid} className={`flex items-center gap-3 px-4 py-3 ${me ? "bg-emerald-500/[0.07]" : ""}`}>
                  <span className="w-7 text-center text-[13px] font-bold tabular-nums" style={{ color: i < 3 ? medal[i] : undefined }}>
                    {i === 0 ? <Crown size={16} color={medal[0]} /> : i + 1}
                  </span>
                  <div className={`w-9 h-9 rounded-md overflow-hidden flex items-center justify-center shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                    {r.photo ? <Image src={r.photo} alt="" width={36} height={36} className="object-cover w-full h-full" /> : <span className="text-[12px] font-semibold text-emerald-500">{r.name.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{r.name}{me ? " (tú)" : ""}</p>
                    <p className={`text-[11px] ${sub}`}>{tier}{scope === "all" && r.city ? ` · ${r.city}` : ""}</p>
                  </div>
                  <span className="text-[13px] font-semibold text-emerald-500 tabular-nums">{r.xp.toLocaleString("es-CL")}{scope === "season" ? " PJ" : ""}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
