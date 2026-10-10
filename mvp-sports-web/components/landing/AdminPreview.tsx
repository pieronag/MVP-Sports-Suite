"use client";
import SectionHeading from "./SectionHeading";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoneyBag01Icon,
  Calendar03Icon,
  TrophyIcon,
  Mortarboard01Icon,
  DashboardSquare01Icon,
  DiscountTag01Icon,
  UserMultipleIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";

const WHATSAPP_URL = `https://wa.me/56950194398?text=${encodeURIComponent(
  "Hola, tengo un recinto deportivo y me gustaría conocer MVP Sports. ¿Podemos agendar una demo para ver cómo gestionar reservas, pagos online y canchas desde la plataforma?"
)}`;

const compactFeatures = [
  {
    icon: DashboardSquare01Icon,
    title: "Gestión de canchas",
    description: "Superficie, iluminación, precio y horarios por cancha.",
    accent: "text-purple-400",
    border: "hover:border-purple-500/30",
  },
  {
    icon: DiscountTag01Icon,
    title: "Cupones y descuentos",
    description: "Códigos con descuento, límite de uso y vigencia.",
    accent: "text-pink-400",
    border: "hover:border-pink-500/30",
  },
  {
    icon: UserMultipleIcon,
    title: "Roles y personal",
    description: "Administradores, staff y supervisores con permisos.",
    accent: "text-emerald-400",
    border: "hover:border-emerald-500/30",
  },
];

export default function AdminPreview({ onRegisterClick }: { onRegisterClick: () => void }) {
  void onRegisterClick;

  return (
    <section id="owners" className="py-16 md:py-24 lg:py-28 relative overflow-hidden bg-slate-950/40">
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00df82]/5 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none"
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <SectionHeading
            eyebrow="Para recintos"
            title={
              <>
                ADMINISTRA TU <br />
                <span className="text-gradient">COMPLEJO DEPORTIVO.</span>
              </>
            }
            description="Un panel para manejar reservas, cobros online, personal y métricas de tu negocio. Menos planillas, más control."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3 md:gap-4 lg:auto-rows-[150px]">
          {/* Finanzas */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-2 group p-4 md:p-7 rounded-md bg-blue-500/[0.07] border border-white/5 hover:border-blue-500/40 transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(59,130,246,0.35)] overflow-hidden relative flex flex-col justify-between gap-3 md:gap-5">
            <div className="relative z-10 flex items-center gap-3 md:block md:space-y-3">
              <HugeiconsIcon icon={MoneyBag01Icon} className="shrink-0 w-8 h-8 md:w-12 md:h-12 text-blue-400" strokeWidth={1.6} />
              <h3 className="text-base sm:text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tight">
                Ingresos y ocupación <br className="hidden md:block" /> en tiempo real.
              </h3>
            </div>
            <p className="relative z-10 text-xs md:text-sm text-slate-400 leading-relaxed">
              Ingresos diarios, ocupación de canchas, ticket promedio y montos por cobrar. Todo
              conciliado con los pagos online.
            </p>
            <HugeiconsIcon
              icon={MoneyBag01Icon}
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 w-28 h-28 md:w-40 md:h-40 text-white/4 group-hover:text-blue-500/10 transition-colors"
            />
          </div>

          {/* Calendario */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-2 group p-4 md:p-7 rounded-md bg-[#00df82]/[0.07] border border-white/5 hover:border-[#00df82]/40 transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(0,223,130,0.35)] overflow-hidden relative flex flex-col justify-between gap-3 md:gap-5">
            <div className="relative z-10 flex items-center gap-3 md:block md:space-y-3">
              <HugeiconsIcon icon={Calendar03Icon} className="shrink-0 w-8 h-8 md:w-12 md:h-12 text-[#00df82]" strokeWidth={1.6} />
              <h3 className="text-base sm:text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tight">
                Agenda sin <br className="hidden md:block" /> dobles reservas.
              </h3>
            </div>
            <p className="relative z-10 text-xs md:text-sm text-slate-400 leading-relaxed">
              Calendario visual por cancha, filtros por deporte, bloqueo por mantenimiento y control
              total de cada horario.
            </p>
            <HugeiconsIcon
              icon={Calendar03Icon}
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 w-28 h-28 md:w-40 md:h-40 text-white/4 group-hover:text-[#00df82]/10 transition-colors"
            />
          </div>

          {/* Torneos */}
          <div className="md:col-span-3 lg:col-span-4 row-span-1 group p-3.5 md:p-6 rounded-md bg-orange-500/[0.07] border border-white/5 hover:border-orange-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10 flex items-start gap-3 md:block md:space-y-1.5">
              <HugeiconsIcon icon={TrophyIcon} className="shrink-0 w-7 h-7 md:w-8 md:h-8 text-orange-400" strokeWidth={1.6} />
              <div className="space-y-1 md:space-y-1.5">
                <h3 className="text-xs md:text-base font-black text-white uppercase tracking-wide">Ligas y campeonatos.</h3>
                <p className="text-[11px] md:text-xs text-slate-400 leading-snug">
                Torneos con grupos y eliminación, fixture y tabla de posiciones.
              </p>
              </div>
            </div>
          </div>

          {/* Academia */}
          <div className="md:col-span-3 lg:col-span-4 row-span-1 group p-3.5 md:p-6 rounded-md bg-sky-500/[0.07] border border-white/5 hover:border-sky-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10 flex items-start gap-3 md:block md:space-y-1.5">
              <HugeiconsIcon icon={Mortarboard01Icon} className="shrink-0 w-7 h-7 md:w-8 md:h-8 text-sky-400" strokeWidth={1.6} />
              <div className="space-y-1 md:space-y-1.5">
                <h3 className="text-xs md:text-base font-black text-white uppercase tracking-wide">Clases y alumnos.</h3>
                <p className="text-[11px] md:text-xs text-slate-400 leading-snug">
                Horarios de clases, lista de alumnos y control de asistencias.
              </p>
              </div>
            </div>
          </div>

          {/* Compactas */}
          {compactFeatures.map((feature) => (
            <div
              key={feature.title}
              className={`md:col-span-2 lg:col-span-3 group p-3.5 md:p-5 rounded-md bg-slate-900/50 border border-white/5 ${feature.border} transition-all duration-300 hover:-translate-y-1 flex items-start md:flex-col gap-3 md:gap-2.5`}
            >
              <HugeiconsIcon icon={feature.icon} className={`shrink-0 w-7 h-7 md:w-11 md:h-11 ${feature.accent}`} strokeWidth={1.6} />
              <div className="space-y-1 md:space-y-2.5">
                <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wide">{feature.title}</h3>
                <p className="text-[11px] md:text-xs text-slate-400 leading-snug">{feature.description}</p>
              </div>
            </div>
          ))}

          {/* CTA WhatsApp */}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="md:col-span-2 lg:col-span-3 group p-3.5 md:p-5 rounded-md bg-linear-to-br from-[#00df82] via-emerald-500 to-teal-500 border border-[#00df82]/30 gap-3 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex flex-col justify-between shadow-[0_0_50px_-15px_rgba(0,223,130,0.5)]"
          >
            <span className="text-[10px] font-black text-slate-900/80 uppercase tracking-[0.2em]">
              Asesoría personalizada
            </span>
            <span className="flex items-end justify-between gap-4">
              <span className="text-sm md:text-xl font-black text-slate-950 uppercase tracking-tighter leading-none">
                Habla con
                <br />
                un experto
              </span>
              <HugeiconsIcon
                icon={WhatsappIcon}
                className="w-8 h-8 text-slate-950 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2}
              />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
