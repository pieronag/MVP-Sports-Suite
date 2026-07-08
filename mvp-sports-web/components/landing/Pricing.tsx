"use client";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";

const WHATSAPP_NUMBER = "56950194398";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-CL").format(n);

export default function Pricing() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const raw = data?.plans || [];
        setPlans(raw.sort((a: any, b: any) => a.price - b.price));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openWhatsApp = (plan: any) => {
    const msg = encodeURIComponent(
      `Hola, quiero informaci\u00f3n sobre el plan ${plan.name} ($${formatPrice(plan.price)}/mes)`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  return (
    <section id="planes" className="py-32 relative overflow-hidden bg-slate-950/40">
      <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-[#00df82]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="container relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-end mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex-[2] space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter font-heading uppercase">
              ELIGE TU <span className="text-gradient">PLAN</span>
            </h2>
          </div>
          <div className="flex-1 lg:pb-2">
            <p className="text-base text-slate-400 font-medium leading-relaxed border-l-2 border-[#00df82]/30 pl-6">
              Elige el plan que se ajuste a tu recinto. Precios claros, sin sorpresas.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[2rem] bg-slate-800/30 border border-white/5 p-8 animate-pulse">
                <div className="h-4 w-20 bg-slate-700/50 rounded-full mb-4" />
                <div className="h-8 w-32 bg-slate-700/50 rounded-xl mb-6" />
                <div className="space-y-3 mb-8">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-4 w-full bg-slate-700/30 rounded-lg" />
                  ))}
                </div>
                <div className="h-12 w-full bg-slate-700/50 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, idx) => {
              const isElite = plan.id === "elite";
              const isFree = plan.id === "free";
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[2rem] p-8 transition-all duration-500 group hover:scale-[1.02] ${
                    isElite
                      ? "bg-gradient-to-b from-emerald-500/10 to-slate-900 border-2 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                      : "bg-slate-900/50 backdrop-blur border border-white/5 hover:border-white/20"
                  }`}
                >
                  {isElite && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-[3px] shadow-lg shadow-emerald-500/30">
                      Recomendado
                    </div>
                  )}
                  {isFree && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-slate-600 text-slate-300 text-[8px] font-bold uppercase tracking-[3px]">
                      Gratis
                    </div>
                  )}

                  <div className="pt-4">
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black text-white">${formatPrice(plan.price)}</span>
                      <span className="text-xs text-slate-500 font-medium">/mes</span>
                    </div>
                    {plan.commission > 0 && (
                      <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
                        Comisión: {plan.commission}%
                      </p>
                    )}
                  </div>

                  <div className="h-px bg-white/5 my-6" />

                  <ul className="space-y-3.5 mb-8">
                    {[
                      { key: "seo", label: "SEO y Google Search" },
                      { key: "topPosition", label: "Prioridad en Búsquedas" },
                      { key: "ads", label: "Publicidad en App" },
                      { key: "analytics", label: "Métricas Avanzadas" },
                      { key: "marketing", label: "Herramientas de Marketing" },
                      { key: "support", label: "Soporte VIP 24/7" },
                      { key: "api", label: "Acceso a API" },
                      { key: "multiRecinto", label: "Gestión Multi-Sede" },
                    ].map((feat) => {
                      const has = plan.features?.[feat.key] === true;
                      return (
                        <li key={feat.key} className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              has
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-700/50 text-slate-600"
                            }`}
                          >
                            {has ? "\u2713" : "\u2717"}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              has ? "text-slate-200" : "text-slate-600"
                            }`}
                          >
                            {feat.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    onClick={() => openWhatsApp(plan)}
                    className={`w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-[2px] transition-all active:scale-[0.98] ${
                      isElite
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
                        : isFree
                        ? "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    Contratar
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-500 font-medium mt-12 max-w-xl mx-auto leading-relaxed">
          Todos los planes incluyen acceso al panel de administración, app para jugadores y soporte técnico.
          <br />
          ¿Dudas? <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-[#00df82] hover:underline font-semibold">Escríbenos a WhatsApp</a>
        </p>
      </div>
    </section>
  );
}
