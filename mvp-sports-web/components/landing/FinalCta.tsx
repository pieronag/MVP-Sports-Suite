import Link from "next/link";

const WHATSAPP_NUMBER = "56950194398";

export default function FinalCta({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <section className="py-16 md:py-24 lg:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative rounded-md overflow-hidden border border-[#00df82]/15 bg-linear-to-br from-slate-900 via-slate-950 to-[#04231a] p-6 sm:p-10 lg:p-16 text-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
          <div aria-hidden="true" className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[320px] bg-[#00df82]/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-[0.95] tracking-tighter font-heading uppercase">
              ¿LISTO PARA <br />
              <span className="text-gradient">JUGAR?</span>
            </h2>
            <p className="text-base text-slate-300 font-medium leading-relaxed max-w-xl mx-auto">
              Crea tu cuenta gratis, reserva tu primera cancha hoy y empieza a sumar XP, logros y
              estadísticas de cada partido.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-10 py-4 bg-[#00df82] text-slate-950 font-black rounded-md hover:bg-[#3affa0] hover:scale-[1.03] active:scale-95 transition-all shadow-[0_0_40px_rgba(0,223,130,0.35)] uppercase tracking-[0.18em] text-[11px] cursor-pointer"
              >
                Crear cuenta gratis
              </button>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  "Hola, tengo un recinto deportivo y quiero profesionalizar mi gestión con MVP Sports."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-4 bg-white/3 text-white font-black rounded-md border border-white/12 hover:bg-white/8 transition-all uppercase tracking-[0.18em] text-[11px] backdrop-blur-xl"
              >
                Soy recinto deportivo
              </a>
            </div>

            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-[0.2em]">
              Sin costo inicial ·{" "}
              <Link href="/login" className="text-slate-300 hover:text-[#00df82] transition-colors">
                Ya tengo cuenta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
