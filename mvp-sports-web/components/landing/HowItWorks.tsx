"use client";
import SectionHeading from "./SectionHeading";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, CreditCardIcon, QrCode01Icon } from "@hugeicons/core-free-icons";

const steps = [
  {
    step: "01",
    icon: Search01Icon,
    title: "Encuentra tu cancha",
    description:
      "Filtra por deporte, comuna y horario. Compara disponibilidad y precio real de cada recinto en segundos, sin llamar a nadie.",
    accent: "text-[#00df82]",
  },
  {
    step: "02",
    icon: CreditCardIcon,
    title: "Reserva y paga online",
    description:
      "Confirma tu horario y paga con Mercado Pago: débito, crédito o saldo. Recibes la confirmación al instante.",
    accent: "text-blue-400",
  },
  {
    step: "03",
    icon: QrCode01Icon,
    title: "Llega y juega",
    description:
      "Muestra tu código QR en el recinto y entra sin filas ni papeleo. Tu historial, logros y estadísticas quedan en tu perfil.",
    accent: "text-indigo-400",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-16 md:py-24 lg:py-28 relative overflow-hidden bg-slate-950/20">
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-[#00df82]/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      />

      <div className="container relative z-10 px-4 md:px-6">
        <SectionHeading
          eyebrow="Cómo funciona"
          title={
            <>
              DE LA BÚSQUEDA <br />
              <span className="text-gradient">AL PARTIDO.</span>
            </>
          }
          description="Tres pasos y cero fricción. Reservar tu cancha toma menos que cambiarte los botines."
        />

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {steps.map((item, index) => (
            <div
              key={item.step}
              style={{ animationDelay: `${index * 100}ms` }}
              className="group relative flex items-start gap-3 md:block p-4 md:p-8 rounded-md bg-slate-900/50 backdrop-blur-sm border border-white/5 hover:border-[#00df82]/30 transition-all duration-300 md:hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-6"
            >
              <span className="absolute top-3 right-4 md:top-6 md:right-7 text-2xl md:text-5xl font-black text-white/6 font-mono">
                {item.step}
              </span>
              <HugeiconsIcon
                icon={item.icon}
                className={`shrink-0 w-8 h-8 md:w-11 md:h-11 ${item.accent} md:mb-6 transition-transform duration-300 group-hover:scale-105`}
                strokeWidth={1.6}
              />
              <div className="pr-6 md:pr-0">
                <h3 className="text-xs md:text-lg font-black text-white uppercase tracking-tight mb-1 md:mb-3">
                  {item.title}
                </h3>
                <p className="text-[11px] md:text-sm text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
