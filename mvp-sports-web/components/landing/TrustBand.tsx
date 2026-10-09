"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TrophyIcon,
  CreditCardIcon,
  Clock01Icon,
  QrCode01Icon,
} from "@hugeicons/core-free-icons";

const stats = [
  { icon: TrophyIcon, value: "6", label: "Deportes en una sola app" },
  { icon: CreditCardIcon, value: "100%", label: "Pagos online con Mercado Pago" },
  { icon: Clock01Icon, value: "24/7", label: "Reserva desde tu celular" },
  { icon: QrCode01Icon, value: "QR", label: "Acceso sin contacto al recinto" },
];

export default function TrustBand() {
  return (
    <section className="py-14 lg:py-20 relative z-10 border-y border-slate-800/50 bg-slate-900/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group flex flex-col gap-3 p-6 rounded-md bg-slate-900/40 border border-white/5 hover:border-[#00df82]/30 transition-all duration-300 hover:-translate-y-1"
            >
              <HugeiconsIcon icon={stat.icon} className="w-7 h-7 text-[#00df82]" strokeWidth={1.6} />
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tighter font-mono leading-none">
                {stat.value}
              </span>
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] text-slate-400 leading-tight">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          Construido con tecnología de{" "}
          <span className="text-slate-300 font-black">Mercado Pago</span>,{" "}
          <span className="text-slate-300 font-black">Google Maps</span> y{" "}
          <span className="text-slate-300 font-black">Firebase</span>
        </p>
      </div>
    </section>
  );
}
