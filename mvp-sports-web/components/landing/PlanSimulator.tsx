"use client";
import { useState } from "react";
import SectionHeading from "./SectionHeading";
import { usePlans } from "./usePlans";

const formatPrice = (n: number) => new Intl.NumberFormat("es-CL").format(n);

export default function PlanSimulator() {
  const { plans } = usePlans();
  const [reservas, setReservas] = useState(300);
  const [precioProm, setPrecioProm] = useState(15000);

  const comision = (plan: (typeof plans)[number]) =>
    (reservas * precioProm * (plan.commission || 0)) / 100;
  const total = (plan: (typeof plans)[number]) => plan.price + comision(plan);

  const freePlan = plans.find((p) => Number(p.price || 0) === 0);
  const ahorro = (plan: (typeof plans)[number]) =>
    freePlan ? Math.round(total(freePlan) - total(plan)) : 0;

  const mejorPlan = plans.length
    ? plans.reduce((best, p) =>
        total(p) < total(best) || (total(p) === total(best) && p.price > best.price) ? p : best
      )
    : null;

  return (
    <section className="py-16 md:py-24 lg:py-28 relative overflow-hidden bg-slate-950/40">
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" aria-hidden="true" />

      <div className="container relative z-10 px-4 md:px-6">
        <SectionHeading
          eyebrow="Simulador"
          title={
            <>
              ¿CUÁL PLAN TE <span className="text-gradient">CONVIENE</span>?
            </>
          }
          description="Calcula cuánto pagarías según tus reservas mensuales y elige el plan más rentable para tu recinto."
        />

        <div className="max-w-2xl mx-auto mb-12 p-8 rounded-md bg-slate-900/50 backdrop-blur-sm border border-white/5">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="reservas" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Reservas al mes
              </label>
              <span className="text-base font-black text-white font-mono">{reservas}</span>
            </div>
            <input
              id="reservas"
              type="range"
              min="0"
              max="1000"
              step="10"
              value={reservas}
              onChange={(e) => setReservas(Number(e.target.value))}
              className="w-full h-2 rounded-md appearance-none cursor-pointer bg-slate-700/50 accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-md [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/40"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-bold mt-2 font-mono">
              <span>0</span><span>250</span><span>500</span><span>750</span><span>1000</span>
            </div>
          </div>

          <div>
            <label htmlFor="precioProm" className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 block">
              Precio promedio por reserva
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">$</span>
              <input
                id="precioProm"
                type="number"
                value={precioProm}
                onChange={(e) => setPrecioProm(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800/50 border border-white/10 rounded-md px-8 py-3.5 text-sm font-black text-white font-mono outline-hidden focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isBest = plan.id === mejorPlan?.id;
            const com = comision(plan);
            const tot = total(plan);
            const aho = ahorro(plan);
            const isFreePlan = Number(plan.price || 0) === 0;
            return (
              <div
                key={plan.id}
                className={`rounded-md p-6 border transition-all ${
                  isBest && !isFreePlan
                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.12)]"
                    : "bg-slate-900/40 border-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">{plan.name}</h3>
                  {isBest && !isFreePlan && (
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.15em] bg-emerald-500/15 px-2.5 py-1 rounded-md">
                      Mejor
                    </span>
                  )}
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Plan</span>
                    <span className="text-white font-bold font-mono">${formatPrice(plan.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Comisión ({plan.commission}%)</span>
                    <span className="text-slate-300 font-mono">${formatPrice(Math.round(com))}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Total estimado</span>
                    <span className={`font-black font-mono ${isBest && !isFreePlan ? "text-emerald-400" : "text-white"}`}>
                      ${formatPrice(Math.round(tot))}
                    </span>
                  </div>
                  {!isFreePlan && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Vs. Free</span>
                      <span className={`font-bold font-mono ${aho >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                        {aho >= 0 ? `Ahorras $${formatPrice(aho)}` : `Pagas $${formatPrice(Math.abs(aho))} más`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {mejorPlan && Number(mejorPlan.price || 0) !== 0 && (
          <p className="text-center text-sm text-slate-400 font-medium mt-8">
            Para <span className="text-white font-black font-mono">{reservas}</span> reservas de{" "}
            <span className="text-white font-black font-mono">${formatPrice(precioProm)}</span>, el más
            rentable es el{" "}
            <span className="text-emerald-400 font-black">{mejorPlan.name}</span>.
          </p>
        )}
      </div>
    </section>
  );
}
