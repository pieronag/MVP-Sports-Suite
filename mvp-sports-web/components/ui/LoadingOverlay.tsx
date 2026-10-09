"use client";
import BrandLogo from "../BrandLogo";

interface LoadingOverlayProps {
  label?: string;
  /** "screen" ocupa toda la pantalla (reemplaza el layout), "area" rellena el contenedor. */
  variant?: "screen" | "area";
}

export default function LoadingOverlay({
  label = "Cargando MVP Sports Suite",
  variant = "area",
}: LoadingOverlayProps) {
  const wrapper =
    variant === "screen"
      ? "min-h-screen w-full"
      : "min-h-[60vh] w-full";

  return (
    <div className={`${wrapper} relative flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#020611]`}>
      {/* grilla */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {/* glow */}
      <div aria-hidden="true" className="absolute w-[440px] h-[440px] bg-emerald-400/20 dark:bg-[#00df82]/15 blur-[130px] rounded-full" />

      <div className="relative flex flex-col items-center gap-6">
        {/* anillo + marca */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 dark:border-[#00df82]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 dark:border-t-[#00df82] animate-spin" />
          <div className="absolute inset-[18%] rounded-full border border-dashed border-emerald-500/25 dark:border-white/10 animate-[spin_7s_linear_infinite_reverse]" />
          <div className="absolute inset-[38%] rounded-full bg-emerald-500/10 dark:bg-[#00df82]/10 blur-md" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BrandLogo size={40} showWordmark={false} appearance="auto" priority />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {label}
          </span>
          <span className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#00df82] animate-pulse"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
