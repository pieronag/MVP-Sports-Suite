"use client";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import BrandLogo from "../BrandLogo";

const trustPoints = ["Pago online con Mercado Pago", "Confirmación instantánea", "Acceso con QR"];

export default function HeroMobile({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <section className="relative min-h-screen h-screen flex items-center justify-center overflow-hidden pt-20 pb-16 md:hidden">
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.15] mask-[radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Radial glows - scaled down for mobile */}
      <div aria-hidden="true" className="absolute -top-32 right-[-20%] w-[300px] h-[300px] bg-[#00df82]/5 blur-[80px] rounded-full" />
      <div aria-hidden="true" className="absolute bottom-[-15%] left-[-15%] w-[280px] h-[280px] bg-blue-500/5 blur-[80px] rounded-full" />

      <div className="container relative z-10 px-4 flex flex-col gap-8">
        {/* Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00df82] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00df82]" />
            </span>
            <span className="text-[9px] font-bold tracking-wider text-slate-300 uppercase">Temporada 2026</span>
          </div>
        </div>

        {/* Heading - optimized for mobile */}
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-black text-white leading-[1.1] tracking-tighter font-heading uppercase">
            Tu Cancha,
            <br />
            <span className="text-gradient text-4xl">A Un Clic.</span>
          </h1>

          <p className="text-sm text-slate-300 max-w-sm mx-auto font-medium leading-relaxed">
            Reserva canchas, paga online y administra tus partidos en segundos.
          </p>
        </div>

        {/* CTA Buttons - stacked on mobile */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRegisterClick}
            className="w-full px-6 py-3.5 bg-[#00df82] text-slate-950 font-black rounded-md hover:bg-[#3affa0] active:scale-95 transition-all shadow-[0_0_35px_rgba(0,223,130,0.35)] uppercase tracking-widest text-[10px] cursor-pointer"
          >
            Comenzar a jugar
          </button>
          <Link
            href="#owners"
            className="w-full px-6 py-3.5 bg-white/5 text-white font-black rounded-md border border-white/12 hover:bg-white/10 transition-all uppercase tracking-widest text-[10px] backdrop-blur-xl text-center"
          >
            Soy recinto deportivo
          </Link>
        </div>

        {/* Trust points - simplified for mobile */}
        <div className="space-y-2">
          {trustPoints.map((point) => (
            <div key={point} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <HugeiconsIcon icon={Tick02Icon} className="w-3 h-3 text-[#00df82] flex-shrink-0" strokeWidth={2.5} />
              <span>{point}</span>
            </div>
          ))}
        </div>

        {/* Logo - centered below content */}
        <div className="flex justify-center pt-4">
          <div className="relative w-[140px] h-[140px]">
            {/* Simple rings */}
            <div aria-hidden="true" className="absolute inset-0 rounded-full border border-[#00df82]/20" />
            <div aria-hidden="true" className="absolute inset-[15%] rounded-full border border-white/10" />

            {/* Center logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <BrandLogo size={60} showWordmark={false} priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
