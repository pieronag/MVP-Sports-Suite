"use client";
import SectionHeading from "./SectionHeading";
import { usePlans } from "./usePlans";
import { FEATURE_LABELS } from "./plans";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

const WHATSAPP_NUMBER = "56950194398";

const formatPrice = (n: number) => new Intl.NumberFormat("es-CL").format(n);

export default function Pricing() {
  const { plans } = usePlans();

  const openWhatsApp = (planName: string, price: number) => {
    const msg = encodeURIComponent(
      `Hola, quiero información sobre el ${planName} ($${formatPrice(price)}/mes)`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="planes" className="py-20 lg:py-32 relative overflow-hidden bg-slate-950/40">
      <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-[#00df82]/5 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />

      <div className="container relative z-10 px-6">
        <SectionHeading
          eyebrow="Planes"
          title={
            <>
              ELIGE TU <span className="text-gradient">PLAN</span>
            </>
          }
          description="Elige el plan que se ajuste a tu recinto. Precios claros, sin sorpresas. Todos incluyen panel de administración, app para jugadores y soporte técnico."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(() => {
            const maxPrice = Math.max(0, ...plans.map(p => Number(p.price || 0)));
            return plans.map((plan, idx) => {
            const isElite = Number(plan.price || 0) === maxPrice && maxPrice > 0;
            const isFree = Number(plan.price || 0) === 0;
            return (
              <div
                key={plan.id}
                style={{ animationDelay: `${idx * 80}ms` }}
                className={`relative rounded-md p-7 transition-all duration-300 group hover:-translate-y-1 flex flex-col animate-in fade-in slide-in-from-bottom-6 ${
                  isElite
                    ? "bg-linear-to-b from-emerald-500/15 to-slate-900 border-2 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
                    : "bg-slate-900/50 backdrop-blur-sm border border-white/5 hover:border-white/20"
                }`}
              >
                {isElite && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/30">
                    Recomendado
                  </div>
                )}
                {isFree && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-md bg-slate-700 text-slate-200 text-[10px] font-black uppercase tracking-[0.2em]">
                    Gratis
                  </div>
                )}

                <div className="pt-2">
                  <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white font-mono">${formatPrice(plan.price)}</span>
                    <span className="text-xs text-slate-500 font-semibold">/mes</span>
                  </div>
                  <p className={`text-[11px] font-bold tracking-wide mt-1 ${plan.commission > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {plan.commission > 0 ? `+ ${plan.commission}% comisión por reserva` : "Sin comisión"}
                  </p>
                </div>

                <div className="h-px bg-white/5 my-6" />

                <ul className="space-y-3 mb-7 flex-1">
                  {FEATURE_LABELS.map((feat) => {
                    const has = plan.features?.[feat.key] === true;
                    return (
                      <li key={feat.key} className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                            has ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/40 text-slate-600"
                          }`}
                        >
                          {has ? (
                            <HugeiconsIcon icon={Tick02Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                          ) : (
                            <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                          )}
                        </span>
                        <span className={`text-xs font-medium ${has ? "text-slate-200" : "text-slate-600"}`}>
                          {feat.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <button
                  onClick={() => openWhatsApp(plan.name, plan.price)}
                  className={`w-full py-3.5 rounded-md text-[11px] font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98] cursor-pointer ${
                    isElite
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
                      : isFree
                      ? "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  {isFree ? "Empezar gratis" : "Contratar"}
                </button>
              </div>
            );
          });
          })()}
        </div>

        <p className="text-center text-xs text-slate-500 font-medium mt-12 max-w-xl mx-auto leading-relaxed">
          ¿Dudas?{" "}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00df82] hover:underline font-bold"
          >
            Escríbenos a WhatsApp
          </a>
        </p>
      </div>
    </section>
  );
}
