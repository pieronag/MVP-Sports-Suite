"use client";
import { useState } from "react";
import { REGIONS } from "@/lib/chileRegions";
import { userService } from "@/services/player/userService";
import { CheckCircle2, ChevronLeft } from "@/components/player/icons";

// Onboarding de 3 pasos (deporte, comuna, nivel): alimenta las búsquedas por preferencias.
const SPORTS = ["Fútbol", "Futbolito", "Pádel", "Tenis", "Básquetbol", "Voleibol"];
const LEVELS = [
  { id: "principiante", label: "Principiante", sub: "Juego por diversión" },
  { id: "intermedio", label: "Intermedio", sub: "Juego seguido y me defiendo" },
  { id: "avanzado", label: "Avanzado", sub: "Compito o juego en liga" },
];

export default function Onboarding({ uid, isDark, initial, onDone }: {
  uid: string; isDark: boolean; initial: { mainSport?: string; city?: string }; onDone: () => void;
}) {
  const [step, setStep] = useState(initial.mainSport ? 1 : 0);
  const [sport, setSport] = useState(initial.mainSport || "");
  const [region, setRegion] = useState(() => Object.keys(REGIONS).find((r) => REGIONS[r].includes(initial.city || "")) || "");
  const [city, setCity] = useState(initial.city || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const card = isDark ? "bg-[#0A101D] border border-white/[0.06]" : "bg-white border border-slate-200";
  const chip = (on: boolean) => `h-11 rounded-md text-[13px] font-semibold transition-all ${on ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-200" : "bg-slate-100 text-slate-700"}`;
  const muted = isDark ? "text-slate-400" : "text-slate-500";
  const titles = ["¿Qué deporte juegas más?", "¿Dónde juegas?", "¿Cuál es tu nivel?"];

  const finish = async (level: string) => {
    setSaving(true); setError("");
    try {
      await userService.updateUserProfile(uid, { mainSport: sport, city, level } as any);
      onDone();
    } catch {
      setError("No pudimos guardar. Intenta de nuevo.");
      setSaving(false);
    }
  };

  return (
    <section aria-label="Personaliza tu experiencia" className={`rounded-md ${card} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        {step > 0 && <button aria-label="Atrás" onClick={() => setStep(step - 1)} className="w-7 h-7 -ml-1 flex items-center justify-center"><ChevronLeft size={16} className="text-emerald-500" /></button>}
        <p className={`text-[11px] font-semibold ${muted}`}>Paso {step + 1} de 3 · personaliza tu búsqueda</p>
      </div>
      <p className={`text-[16px] font-heading font-black mb-3 ${isDark ? "text-slate-100" : "text-slate-900"}`}>{titles[step]}</p>

      {step === 0 && (
        <div className="grid grid-cols-3 gap-2">
          {SPORTS.map((s) => <button key={s} className={chip(sport === s)} onClick={() => { setSport(s); setStep(1); }}>{s}</button>)}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <select aria-label="Región" value={region} onChange={(e) => { setRegion(e.target.value); setCity(""); }}
            className={`w-full h-11 rounded-md px-3 text-[13px] font-semibold outline-none border ${isDark ? "bg-[#020611] text-slate-200 border-white/[0.06]" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
            <option value="">Elige tu región</option>
            {Object.keys(REGIONS).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {region && (
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
              {REGIONS[region].map((c) => (
                <button key={c} onClick={() => { setCity(c); setStep(2); }} className={`px-3 h-9 rounded-md text-[12px] font-medium ${city === c ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-600"}`}>{c}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <button key={l.id} disabled={saving} onClick={() => finish(l.id)}
              className={`w-full text-left px-4 py-3 rounded-md border transition-all disabled:opacity-60 ${isDark ? "border-white/[0.08] hover:border-emerald-500/40" : "border-slate-200 hover:border-emerald-500/40"}`}>
              <p className={`text-[13px] font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>{l.label}</p>
              <p className={`text-[12px] ${muted}`}>{l.sub}</p>
            </button>
          ))}
          {saving && <p className="flex items-center gap-1.5 text-[12px] text-emerald-500"><CheckCircle2 size={14} /> Guardando…</p>}
          {error && <p role="alert" className="text-[12px] text-rose-500">{error}</p>}
        </div>
      )}
    </section>
  );
}
