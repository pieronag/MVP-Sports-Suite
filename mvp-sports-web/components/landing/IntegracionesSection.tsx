"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { Shield01Icon, MapPinIcon, SquareLock01Icon } from "@hugeicons/core-free-icons";

const integrations = [
  {
    icon: Shield01Icon,
    name: "Transbank",
    detail: "Pagos Webpay Plus y Oneclick",
  },
  {
    icon: MapPinIcon,
    name: "Google Maps",
    detail: "Ubicación de recintos y mapa",
  },
  {
    icon: SquareLock01Icon,
    name: "Firebase",
    detail: "Autenticación y datos seguros",
  },
];

export default function IntegracionesSection() {
  return (
    <section className="py-16 lg:py-20 relative overflow-hidden border-t border-white/5 bg-slate-950/30">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-12 text-center lg:text-left">
          <div className="space-y-2 max-w-md">
            <p className="text-[11px] font-black text-[#00df82] uppercase tracking-[0.35em]">
              Tecnología en la que confías
            </p>
            <h3 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter font-heading">
              Integraciones de primer nivel
            </h3>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-end gap-4">
            {integrations.map((item) => (
              <div
                key={item.name}
                className="group flex items-center gap-3 px-5 py-3.5 rounded-md bg-slate-900/50 border border-white/5 hover:border-[#00df82]/30 transition-all duration-300"
              >
                <HugeiconsIcon icon={item.icon} className="w-6 h-6 text-[#00df82]" strokeWidth={1.6} />
                <span className="text-left">
                  <span className="block text-sm font-black text-white uppercase tracking-wide leading-none">
                    {item.name}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-500 mt-0.5">
                    {item.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
