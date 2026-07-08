"use client";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-CL").format(n);

export default function PlanSimulator() {
  const [plans, setPlans] = useState<any[]>([]);
  const [reservas, setReservas] = useState(30);
  const [precioProm, setPrecioProm] = useState(15000);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const raw = snap.data()?.plans || [];
        setPlans(raw.sort((a: any, b: any) => a.price - b.price));
      }
    });
    return () => unsub();
  }, []);

  const comision = (plan: any) => (reservas * precioProm * (plan.commission || 0)) / 100;
  const total = (plan: any) => plan.price + comision(plan);
  const freeTotal = plans.find((p: any) => p.id === "free");
  const ahorro = (plan: any) => freeTotal ? Math.round(total(freeTotal) - total(plan)) : 0;

  const mejorPlan = plans.length
    ? plans.reduce((best: any, p: any) =>
        total(p) < total(best) || (total(p) === total(best) && p.price > best.price) ? p : best
      )
    : null;

  return (
    <section className="py-32 relative overflow-hidden bg-slate-950/40">
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
      <div className="container relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-end mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex-[2] space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter font-heading uppercase">
              ¿CUÁL PLAN TE <span className="text-gradient">CONVIENE</span>?
            </h2>
          </div>
          <div className="flex-1 lg:pb-2">
            <p className="text-base text-slate-400 font-medium leading-relaxed border-l-2 border-[#00df82]/30 pl-6">
              Calcula cuánto pagarías según tus reservas mensuales y elige el plan más rentable.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-12 p-8 rounded-[2rem] bg-slate-900/50 backdrop-blur border border-white/5">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Reservas al mes</span>
              <span className="text-sm font-bold text-white font-mono">{reservas}</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="5"
              value={reservas}
              onChange={(e) => setReservas(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700/50 accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/40"
            />
            <div className="flex justify-between text-[9px] text-slate-600 font-medium mt-1">
              <span>0</span><span>100</span><span>200</span><span>300</span><span>400</span><span>500</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 block">Precio promedio por reserva</span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">$</span>
              <input
                type="number"
                value={precioProm}
                onChange={(e) => setPrecioProm(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-8 py-3.5 text-sm font-bold text-white font-mono outline-none focus:border-emerald-500/40 transition-all"
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
            return (
              <div
                key={plan.id}
                className={`rounded-[1.5rem] p-6 border transition-all ${
                  isBest && plan.id !== "free"
                    ? "bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                    : "bg-slate-900/40 border-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{plan.name}</h3>
                  {isBest && plan.id !== "free" && (
                    <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-[2px] bg-emerald-500/15 px-2.5 py-1 rounded-full">Mejor</span>
                  )}
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Plan</span>
                    <span className="text-white font-semibold font-mono">${formatPrice(plan.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Comisión ({plan.commission}%)</span>
                    <span className="text-slate-300 font-mono">${formatPrice(Math.round(com))}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Total</span>
                    <span className={`font-bold font-mono ${isBest && plan.id !== "free" ? "text-emerald-400" : "text-white"}`}>
                      ${formatPrice(Math.round(tot))}
                    </span>
                  </div>
                  {plan.id !== "free" && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">vs Free</span>
                      <span className={`font-semibold font-mono ${aho >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                        {aho >= 0 ? `+$${formatPrice(aho)}` : `-$${formatPrice(Math.abs(aho))}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
