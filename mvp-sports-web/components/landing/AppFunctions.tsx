import SectionHeading from "./SectionHeading";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FlashIcon,
  TrophyIcon,
  CreditCardIcon,
  BarChartIcon,
  UserGroupIcon,
  IdentityCardIcon,
  UserAdd01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

const compactFeatures = [
  {
    icon: UserGroupIcon,
    title: "Equipos y chat",
    description: "Crea tu equipo, invita jugadores y coordina los partidos.",
    accent: "text-indigo-400",
    border: "hover:border-indigo-500/30",
  },
  {
    icon: IdentityCardIcon,
    title: "Carta de jugador",
    description: "Tu MVP Card con nivel, valoración y logros, lista para compartir.",
    accent: "text-sky-400",
    border: "hover:border-sky-500/30",
  },
  {
    icon: UserAdd01Icon,
    title: "Busca rival",
    description: "Encuentra oponentes y registra cada enfrentamiento.",
    accent: "text-purple-400",
    border: "hover:border-purple-500/30",
  },
];

export default function AppFunctions({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <section id="player-functions" className="py-12 md:py-20 lg:py-32 relative overflow-hidden bg-slate-950/20">
      <div
        aria-hidden="true"
        className="absolute top-0 right-1/4 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-blue-500/5 blur-[80px] lg:blur-[120px] rounded-full -translate-y-1/2 pointer-events-none"
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 mb-8 md:mb-12">
          <SectionHeading
            eyebrow="Para jugadores"
            title={
              <>
                TU APP PARA <br />
                <span className="text-gradient">AGENDAR CANCHAS.</span>
              </>
            }
            description="Encuentra canchas cerca de ti, reserva al instante y paga online. Menos llamadas, más partidos."
          />
        </div>

        {/* Mobile: Stack vertical, Desktop: Bento Grid */}
        <div className="space-y-3 md:space-y-4 md:grid md:grid-cols-6 lg:grid-cols-12 md:gap-4 lg:auto-rows-[150px]">
          {/* Reserva (grande) */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-2 group p-5 md:p-7 rounded-md bg-[#00df82]/[0.07] border border-white/5 hover:border-[#00df82]/40 transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(0,223,130,0.35)] overflow-hidden relative flex flex-col justify-between gap-4 md:gap-5">
            <div className="relative z-10 space-y-2 md:space-y-3">
              <HugeiconsIcon icon={FlashIcon} className="w-10 md:w-12 h-10 md:h-12 text-[#00df82]" strokeWidth={1.6} />
              <h3 className="text-lg md:text-xl lg:text-2xl font-black text-white leading-tight">
                Canchas disponibles <br /> en tiempo real.
              </h3>
            </div>
            <p className="relative z-10 text-xs md:text-sm text-slate-400 leading-relaxed">
              Busca por deporte, fecha y horario. Ve la disponibilidad al segundo y reserva sin esperar.
            </p>
            <HugeiconsIcon
              icon={FlashIcon}
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 w-32 md:w-40 h-32 md:h-40 text-white/4 group-hover:text-[#00df82]/10 transition-colors"
            />
          </div>

          {/* Perfil y progreso (grande) */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-2 group p-5 md:p-7 rounded-md bg-blue-500/[0.07] border border-white/5 hover:border-blue-500/40 transition-all duration-500 hover:shadow-[0_0_50px_-15px_rgba(59,130,246,0.35)] overflow-hidden relative flex flex-col justify-between gap-4 md:gap-5">
            <div className="relative z-10 space-y-2 md:space-y-3">
              <HugeiconsIcon icon={TrophyIcon} className="w-10 md:w-12 h-10 md:h-12 text-blue-400" strokeWidth={1.6} />
              <h3 className="text-lg md:text-xl lg:text-2xl font-black text-white leading-tight">
                Gana XP y <br /> sube de nivel.
              </h3>
            </div>
            <p className="relative z-10 text-xs md:text-sm text-slate-400 leading-relaxed">
              Suma experiencia por cada partido, desbloquea logros y construye tu historial deportivo.
            </p>
            <HugeiconsIcon
              icon={TrophyIcon}
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 w-32 md:w-40 h-32 md:h-40 text-white/4 group-hover:text-blue-500/10 transition-colors"
            />
          </div>

          {/* Pago online (mediana) */}
          <div className="md:col-span-3 lg:col-span-4 md:row-span-1 group p-5 md:p-6 rounded-md bg-emerald-500/[0.07] border border-white/5 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10 space-y-2 md:space-y-1.5">
              <HugeiconsIcon icon={CreditCardIcon} className="w-8 h-8 text-emerald-400" strokeWidth={1.6} />
              <h3 className="text-sm md:text-base font-black text-white">Pago 100% online.</h3>
              <p className="text-xs text-slate-400 leading-snug">
                Mercado Pago con débito, crédito o saldo.
              </p>
            </div>
          </div>

          {/* Estadísticas (mediana) */}
          <div className="md:col-span-3 lg:col-span-4 md:row-span-1 group p-5 md:p-6 rounded-md bg-orange-500/[0.07] border border-white/5 hover:border-orange-500/30 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10 space-y-2 md:space-y-1.5">
              <HugeiconsIcon icon={BarChartIcon} className="w-8 h-8 text-orange-400" strokeWidth={1.6} />
              <h3 className="text-sm md:text-base font-black text-white">Mide tu rendimiento.</h3>
              <p className="text-xs text-slate-400 leading-snug">
                Partidos, goles, asistencias y logros.
              </p>
            </div>
          </div>

          {/* Compactas */}
          {compactFeatures.map((feature) => (
            <div
              key={feature.title}
              className={`md:col-span-2 lg:col-span-3 group p-5 rounded-md bg-slate-900/50 border border-white/5 ${feature.border} transition-all duration-300 hover:md:-translate-y-1 flex flex-col gap-2.5`}
            >
              <HugeiconsIcon icon={feature.icon} className={`w-9 md:w-11 h-9 md:h-11 ${feature.accent}`} strokeWidth={1.6} />
              <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wide">{feature.title}</h3>
              <p className="text-xs text-slate-400 leading-snug">{feature.description}</p>
            </div>
          ))}

          {/* CTA */}
          <button
            type="button"
            onClick={onRegisterClick}
            className="md:col-span-2 lg:col-span-3 group p-5 rounded-md bg-linear-to-br from-[#00df82] via-emerald-500 to-teal-500 border border-[#00df82]/30 hover:md:scale-[1.02] active:scale-95 transition-all duration-300 flex flex-col justify-between text-left cursor-pointer shadow-[0_0_50px_-15px_rgba(0,223,130,0.5)] min-h-[120px]"
          >
            <span className="text-[9px] md:text-[10px] font-black text-slate-900/80 uppercase tracking-[0.2em]">
              Únete a la comunidad
            </span>
            <span className="flex items-end justify-between gap-3 md:gap-4">
              <span className="text-base md:text-xl font-black text-slate-950 uppercase tracking-tighter leading-none">
                Regístrate
                <br />
                gratis
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="w-6 md:w-8 h-6 md:h-8 text-slate-950 transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0"
                strokeWidth={2}
              />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
