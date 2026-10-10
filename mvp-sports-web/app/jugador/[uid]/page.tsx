import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/services/server/firebase-admin";

// Perfil público para compartir: solo datos deportivos (nada de contacto ni documentos)
export const revalidate = 600;

const TIERS: [string, string][] = [["legend", "Leyenda"], ["elite", "Elite"], ["diamond", "Diamante"], ["platinum", "Platino"], ["gold", "Oro"], ["silver", "Plata"]];

async function load(uid: string) {
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return null;
  const db = adminDb();
  const [u, g] = await Promise.all([db.collection("users").doc(uid).get(), db.collection("settings").doc("global").get()]);
  if (!u.exists) return null;
  const d: any = u.data();
  if (d.role && String(d.role).toLowerCase() !== "player") return null; // solo jugadores
  const tiers = g.data()?.gamification?.tiers || {};
  const xp = Number(d.xp) || 0;
  const tier = TIERS.find(([k]) => typeof tiers[k] === "number" && xp >= tiers[k])?.[1] || "Bronce";
  const legend = Number(tiers.legend) || 25000;
  const ovr = Math.floor(40 + Math.min(1, Math.sqrt(xp / legend)) * 59);
  const parts = String(d.displayName || d.fullName || "Jugador").trim().split(/\s+/);
  const name = parts[1] ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.` : parts[0];
  const s = d.stats || {};
  return {
    name, photo: d.photoURL || "", city: d.city || "", sport: d.mainSport || "", position: d.position || "",
    xp, tier, ovr, played: Number(s.played ?? d.matchesPlayed) || 0, won: Number(s.won ?? d.matchesWon) || 0,
    goals: Number(s.goals ?? d.goals) || 0, mvps: Number(s.mvps ?? d.mvps) || 0,
    badges: Array.isArray(d.badges) ? d.badges.length : 0,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const p = await load((await params).uid).catch(() => null);
  if (!p) return { title: "Jugador | MVP Sports" };
  const title = `${p.name} · ${p.ovr} OVR · ${p.tier} | MVP Sports`;
  const description = `${p.played} partidos, ${p.won} victorias${p.goals ? `, ${p.goals} goles` : ""}${p.city ? ` · ${p.city}` : ""}. Juega en MVP Sports.`;
  return { title, description, openGraph: { title, description, images: p.photo ? [p.photo] : undefined } };
}

export default async function PublicPlayer({ params }: { params: Promise<{ uid: string }> }) {
  const p = await load((await params).uid).catch(() => null);
  if (!p) notFound();
  const stat = (v: number, l: string) => (
    <div className="rounded-md bg-[#0A101D] border border-white/[0.06] p-3 text-center">
      <p className="text-[20px] font-bold text-slate-100 tabular-nums">{v}</p>
      <p className="text-[11px] text-slate-400">{l}</p>
    </div>
  );
  return (
    <main className="min-h-screen bg-[#020611] text-slate-100 flex justify-center">
      <div className="w-full max-w-[430px] px-5 py-10 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-md overflow-hidden bg-emerald-500/10 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl font-bold text-emerald-500">{p.name.charAt(0)}</span>}
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-heading font-black tracking-tight truncate">{p.name}</h1>
            <p className="text-[13px] text-slate-400"><span className="text-emerald-500 font-semibold">{p.tier}</span>{p.sport ? ` · ${p.sport}` : ""}{p.position ? ` · ${p.position}` : ""}</p>
            {p.city && <p className="text-[12px] text-slate-500">{p.city}</p>}
          </div>
          <div className="ml-auto w-[60px] h-[76px] rounded-md bg-gradient-to-b from-amber-400 to-amber-600 flex flex-col items-center justify-center -rotate-[4deg] shrink-0">
            <span className="text-black/60 text-[10px] font-medium">OVR</span>
            <span className="text-black text-[24px] font-bold leading-none">{p.ovr}</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stat(p.played, "Partidos")}{stat(p.won, "Victorias")}{stat(p.goals, "Goles")}{stat(p.mvps, "MVP")}
        </div>
        <p className="text-[13px] text-slate-400">{p.xp.toLocaleString("es-CL")} XP · {p.badges} insignia{p.badges === 1 ? "" : "s"}</p>
        <Link href="/" className="block w-full h-12 rounded-md bg-emerald-500 text-white text-[14px] font-semibold text-center leading-[48px]">Juega en MVP Sports</Link>
      </div>
    </main>
  );
}
