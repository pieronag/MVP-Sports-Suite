"use client";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import BrandLogo from "../BrandLogo";

const trustPoints = ["Pago online con Webpay", "Confirmación instantánea", "Acceso con QR"];

const ORBIT_OUTER = [0, 45, 90, 135, 180, 225, 270, 315];
const ORBIT_INNER = [22, 96, 170, 244, 318];

export default function Hero({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <section className="relative min-h-screen h-screen flex items-center justify-center overflow-hidden pt-24 lg:pt-16 pb-16 lg:pb-12">
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* Radial glows */}
      <div aria-hidden="true" className="absolute -top-40 right-[-10%] w-[620px] h-[620px] bg-[#00df82]/10 blur-[140px] rounded-full" />
      <div aria-hidden="true" className="absolute bottom-[-20%] left-[-10%] w-[520px] h-[520px] bg-blue-500/10 blur-[140px] rounded-full" />

      <div className="container relative z-10 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-12 items-center">
          {/* LEFT */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 px-3.5 py-2 rounded-md bg-white/[0.03] border border-white/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00df82] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00df82]" />
              </span>
              <span className="text-[11px] font-bold tracking-[0.22em] text-slate-300 uppercase">
                Temporada 2026 · Reserva online
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter font-heading animate-in fade-in slide-in-from-left-8 duration-700 uppercase">
              TU CANCHA,
              <br />
              <span className="text-gradient">A UN CLIC.</span>
            </h1>

            <p className="text-base lg:text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed animate-in fade-in slide-in-from-left-8 duration-700 stagger-2">
              Reserva canchas de pádel, futbolito y tenis en segundos, paga online y administra tus
              partidos desde un solo lugar. Tú juegas, nosotros ordenamos el resto.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-8 duration-700 stagger-3">
              <button
                onClick={onRegisterClick}
                className="group w-full sm:w-auto px-9 py-4 bg-[#00df82] text-slate-950 font-black rounded-md hover:bg-[#3affa0] active:scale-95 transition-all shadow-[0_0_35px_rgba(0,223,130,0.35)] hover:shadow-[0_0_50px_rgba(0,223,130,0.5)] uppercase tracking-[0.18em] text-[11px] cursor-pointer"
              >
                Comenzar a jugar
              </button>
              <Link
                href="#owners"
                className="w-full sm:w-auto px-9 py-4 bg-white/[0.03] text-white font-black rounded-md border border-white/12 hover:bg-white/[0.08] hover:border-white/20 transition-all uppercase tracking-[0.18em] text-[11px] backdrop-blur-xl"
              >
                Soy recinto deportivo
              </Link>
            </div>

            <ul className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 pt-1">
              {trustPoints.map((point) => (
                <li key={point} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <HugeiconsIcon icon={Tick02Icon} className="w-3.5 h-3.5 text-[#00df82]" strokeWidth={2.5} aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — circular HUD */}
          <div className="relative flex justify-center items-center animate-in fade-in zoom-in duration-700 stagger-2">
            <div className="relative w-full max-w-[380px] lg:max-w-[42vh] xl:max-w-[440px] aspect-square">
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
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#00e0ff] shadow-[0_0_8px_#00e0ff]" />
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
