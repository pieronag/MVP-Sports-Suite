"use client";
// Card de recinto para el buscador (Recintos y Mapa): foto, nombre, comuna, deportes y tarifa desde
import { Star, MapPin, Navigation } from "@/components/player/icons";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from "@/components/icons/SportsIcons";

const SPORT_ICON: Record<string, any> = {
  "fútbol": FutbolIcon, futbol: FutbolIcon, futbolito: FutbolIcon, "pádel": PadelIcon, padel: PadelIcon,
  tenis: TenisIcon, "básquetbol": BasquetbolIcon, basquetbol: BasquetbolIcon, "vóleibol": VoleibolIcon, voleibol: VoleibolIcon,
};

// Tarifa más baja publicada por el recinto (cualquier deporte y bloque)
export const priceFrom = (venue: any): number | null => {
  const vals: number[] = [];
  for (const bySlot of Object.values(venue?.pricing || {})) {
    if (typeof bySlot === "number") { if (bySlot > 0) vals.push(bySlot); continue; }
    for (const v of Object.values((bySlot as any) || {})) if (typeof v === "number" && v > 0) vals.push(v);
  }
  return vals.length ? Math.min(...vals) : null;
};

export default function VenueCard({ venue, image, sports, commune, distance, isDark, onClick }: {
  venue: any; image: string; sports: string[]; commune?: string; distance?: string | null; isDark: boolean; onClick: () => void;
}) {
  const price = priceFrom(venue);
  const rating = Number(venue.rating) > 0 ? Number(venue.rating).toFixed(1) : "Nuevo";
  return (
    <button onClick={onClick} aria-label={`Ver ${venue.name}`}
      className={`group w-full block text-left rounded-md overflow-hidden border transition-transform active:scale-[0.99] ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`}>
      <div className="h-[184px] relative overflow-hidden">
        <img src={image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-black/10" />
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/55 backdrop-blur-sm px-2.5 h-8 rounded-md">
          <Star size={13} className="text-amber-400" fill="currentColor" />
          <span className="text-white font-semibold text-[12px] tabular-nums">{rating}</span>
        </div>
        <div className="absolute left-4 right-4 bottom-3.5">
          <p className="text-white text-[20px] font-heading font-black tracking-tight leading-tight line-clamp-2">{venue.name}</p>
          <p className="flex items-center gap-1.5 mt-1 text-white/80 text-[12px] font-medium">
            {commune && <><MapPin size={12} /> {commune}</>}
            {distance && <>{commune ? " · " : ""}<Navigation size={11} /> {distance}</>}
          </p>
        </div>
      </div>
      <div className="px-4 py-3.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {sports.slice(0, 2).map((s) => {
            const Icon = SPORT_ICON[s.toLowerCase()];
            return (
              <span key={s} className={`flex items-center gap-1 h-7 px-2 rounded-md text-[12px] font-semibold whitespace-nowrap ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                {Icon && <Icon color="currentColor" size={13} />}{s}
              </span>
            );
          })}
          {sports.length > 2 && <span className={`text-[12px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>+{sports.length - 2}</span>}
        </div>
        <div className="text-right shrink-0">
          {price ? (
            <>
              <p className={`text-[11px] font-medium leading-none ${isDark ? "text-slate-400" : "text-slate-500"}`}>desde</p>
              <p className={`text-[15px] font-heading font-black tabular-nums leading-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>${price.toLocaleString("es-CL")}</p>
            </>
          ) : (
            <span className="text-emerald-500 text-[13px] font-semibold">Ver horarios</span>
          )}
        </div>
      </div>
    </button>
  );
}
