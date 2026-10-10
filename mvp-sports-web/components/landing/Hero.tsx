"use client";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import BrandLogo from "../BrandLogo";

const trustPoints = ["Pago online con Mercado Pago", "Confirmación instantánea", "Acceso con QR"];

const ORBIT_OUTER = [0, 45, 90, 135, 180, 225, 270, 315];
const ORBIT_INNER = [22, 96, 170, 244, 318];

export default function Hero({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <section className="relative min-h-screen lg:h-screen flex items-start lg:items-center justify-center overflow-hidden pt-32 md:pt-36 lg:pt-16 pb-12 md:pb-16 lg:pb-12">
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.2] md:opacity-[0.35] mask-[radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radial glows - scaled for mobile */}
      <div aria-hidden="true" className="absolute -top-40 right-[-20%] md:right-[-10%] w-[400px] md:w-[620px] h-[400px] md:h-[620px] bg-[#00df82]/5 md:bg-[#00df82]/10 blur-[100px] md:blur-[140px] rounded-full" />
      <div aria-hidden="true" className="absolute bottom-[-15%] left-[-20%] md:left-[-10%] w-[350px] md:w-[520px] h-[350px] md:h-[520px] bg-blue-500/5 md:bg-blue-500/10 blur-[100px] md:blur-[140px] rounded-full" />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-12 items-center">
          {/* LEFT */}
          <div className="space-y-6 md:space-y-8 text-center md:text-left">
            <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-3.5 py-1.5 md:py-2 rounded-md bg-white/3 border border-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00df82] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00df82]" />
              </span>
              <span className="text-[10px] md:text-[11px] font-bold tracking-[0.2em] md:tracking-[0.22em] text-slate-300 uppercase">
                Temporada 2026 · Reserva online
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white leading-[0.95] md:leading-[0.9] tracking-tighter font-heading animate-in fade-in slide-in-from-left-8 duration-700 uppercase">
              TU CANCHA,
              <br />
              <span className="text-gradient">A UN CLIC.</span>
            </h1>

            <p className="text-sm md:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto md:mx-0 font-medium leading-relaxed animate-in fade-in slide-in-from-left-8 duration-700 stagger-2">
              Reserva canchas en segundos, paga online y administra tus partidos desde un solo lugar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 stagger-3">
              <button
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-[#00df82] text-slate-950 font-black rounded-md hover:bg-[#3affa0] hover:scale-[1.03] active:scale-95 transition-all shadow-[0_0_40px_rgba(0,223,130,0.35)] uppercase tracking-[0.18em] text-[11px] cursor-pointer"
              >
                Crear cuenta gratis
              </button>
              <Link
                href="#owners"
                className="w-full sm:w-auto px-8 md:px-10 py-3.5 md:py-4 bg-white/3 text-white font-black rounded-md border border-white/12 hover:bg-white/8 transition-all uppercase tracking-[0.18em] text-[11px] backdrop-blur-xl text-center"
              >
                Soy recinto deportivo
              </Link>
            </div>

            <ul className="flex flex-col md:flex-row md:flex-wrap items-center justify-center md:justify-start gap-x-4 md:gap-x-6 gap-y-2 pt-2 md:pt-1">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <HugeiconsIcon icon={Tick02Icon} className="w-3 md:w-3.5 h-3 md:h-3.5 text-[#00df82] flex-shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — circular HUD */}
          <div className="flex relative justify-center items-center animate-in fade-in zoom-in duration-700 stagger-2">
            <div className="relative w-full max-w-[240px] sm:max-w-[300px] md:max-w-[380px] lg:max-w-[42vh] xl:max-w-[440px] aspect-square">
              {/* glows */}
              <div aria-hidden="true" className="absolute inset-[6%] rounded-full bg-[#00df82]/15 blur-[80px]" />
              <div aria-hidden="true" className="absolute inset-[24%] rounded-full bg-cyan-500/10 blur-[60px]" />

              {/* main disc */}
              <div className="absolute inset-0 rounded-full border border-[#00df82]/25 bg-slate-900/30 backdrop-blur-xl overflow-hidden shadow-[0_0_70px_-25px_rgba(0,223,130,0.7)]">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                  }}
                />
              </div>

              {/* rings */}
              <div aria-hidden="true" className="absolute inset-[7%] rounded-full border border-dashed border-white/12" />
              <div aria-hidden="true" className="absolute inset-[19%] rounded-full border border-[#00df82]/20" />
              <div aria-hidden="true" className="absolute inset-[31%] rounded-full border border-white/10" />

              {/* orbiting particles — outer */}
              <div aria-hidden="true" className="absolute inset-[9%] animate-[spin_26s_linear_infinite]">
                {ORBIT_OUTER.map((deg) => (
                  <div key={deg} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#00df82] shadow-[0_0_10px_#00df82]" />
                  </div>
                ))}
              </div>

              {/* orbiting particles — inner (counter-rotating) */}
              <div aria-hidden="true" className="absolute inset-[23%] animate-[spin_16s_linear_infinite_reverse]">
                {ORBIT_INNER.map((deg) => (
                  <div key={deg} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)` }}>
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-mvp-cyan shadow-[0_0_8px_#00e0ff]" />
                  </div>
                ))}
              </div>

              {/* center logo (no frame / no background) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <BrandLogo size={96} showWordmark={false} priority />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
