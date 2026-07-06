"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, Star, MapPin, Navigation, Compass } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { venueService, Tenant } from "@/services/player/venueService";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from "@/components/icons/SportsIcons";

const SPORT_ICON_MAP: Record<string, any> = {
  futbol: FutbolIcon, "fútbol": FutbolIcon, futbolito: FutbolIcon,
  padel: PadelIcon, "pádel": PadelIcon,
  tenis: TenisIcon,
  basquet: BasquetbolIcon, basket: BasquetbolIcon, básquetbol: BasquetbolIcon,
  voley: VoleibolIcon, "vóley": VoleibolIcon, voleibol: VoleibolIcon,
};

function GlowCard({ isDark, children, className = "" }: { isDark: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[14px] ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"} ${className}`}>
      <div className={`absolute inset-0 rounded-[14px] pointer-events-none ${isDark ? "bg-gradient-to-br from-emerald-500/[0.02] to-transparent" : ""}`} />
      {children}
    </div>
  );
}

const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
};

const getVenueImage = (venue: any) => {
  const data = venue as any;
  const url = data.imageURL || data.imageUrl;
  if (url && (url.startsWith("data:image") || url.startsWith("http"))) return url;
  const allSports = (data.activeSports || data.sports || ["Multicancha"]) as string[];
  const s = (allSports[0] || "").toLowerCase();
  if (s.includes("padel")) return "https://images.unsplash.com/photo-1626248801379-51a0748a5f96";
  if (s.includes("tenis")) return "https://images.unsplash.com/photo-1595435064215-68d148332009";
  return "https://images.unsplash.com/photo-1574629810360-7efbbe195018";
};

function SectionPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 mb-4 mt-4">
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
    </div>
  );
}

const getSportEmoji = (sportName: string) => {
  const s = (sportName || "").toLowerCase();
  if (s === "todos" || s === "todo") return null;
  const icons: Record<string, string> = { futbol: "⚽", fútbol: "⚽", padel: "🎾", pádel: "🎾", tenis: "🎾", basquet: "🏀", basket: "🏀", voley: "🏐", vóley: "🏐", entrenamiento: "💪", training: "💪" };
  for (const [k, v] of Object.entries(icons)) { if (s.includes(k)) return v; }
  return null;
};

export default function ExploreClubesPage() {
  const router = useRouter();
  const { profile, theme } = usePlayer();
  const isDark = theme === "dark";

  const [search, setSearch] = useState("");
  const [venues, setVenues] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState("Todos");
  const [selectedCommune, setSelectedCommune] = useState("Todas");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => { navigator.geolocation.getCurrentPosition((pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 10000 }); }, []);
  useEffect(() => { venueService.getVenues().then(setVenues).catch(console.error).finally(() => setLoading(false)); }, []);

  const sportsList = useMemo(() => {
    const s = new Set(["Todos"]);
    venues.forEach((v) => { ((v as any).activeSports || (v as any).sports || []).forEach((sp: string) => { if (sp) s.add(sp); }); });
    return Array.from(s);
  }, [venues]);

  const communesList = useMemo(() => {
    const c = new Set(["Todas"]);
    venues.forEach((v) => { const com = (v as any).commune || (v as any).comuna; if (com) c.add(com); });
    return Array.from(c);
  }, [venues]);

  const filteredVenues = useMemo(() => {
    const norm = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const ns = norm(selectedSport);
    return venues.filter((v) => {
      const ms = v.name.toLowerCase().includes(search.toLowerCase());
      const all = (v as any).activeSports || (v as any).sports || [];
      const msp = selectedSport === "Todos" || all.some((s: string) => norm(s).includes(ns) || ns.includes(norm(s)));
      const com = (v as any).commune || (v as any).comuna;
      const mc = selectedCommune === "Todas" || com === selectedCommune;
      return ms && msp && mc;
    });
  }, [venues, search, selectedSport, selectedCommune]);

  const calcDistance = (venue: any) => {
    if (!userLocation) return null;
    const c = (venue as any)?.coordinates || (venue as any)?.location;
    if (!c) return null;
    const lat = c.latitude || c._lat || c.lat;
    const lng = c.longitude || c._long || c.lng;
    if (!lat || !lng) return null;
    return formatDistance(userLocation.latitude, userLocation.longitude, lat, lng);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-400 text-[10px] font-semibold tracking-[3px] uppercase animate-pulse">Cargando</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
            <ChevronLeft size={20} className="text-emerald-500" />
          </button>
          <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center">Recintos</h1>
          <div className="w-10" />
        </div>
        <div className={`flex items-center gap-3 px-4 h-12 rounded-[14px] border ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
          <Search size={16} className="text-emerald-500 shrink-0" />
          <input placeholder="Buscar club o recinto..." value={search} onChange={(e) => setSearch(e.target.value)}
            className={`flex-1 bg-transparent text-sm font-medium outline-none ${isDark ? "text-slate-100 placeholder-slate-600" : "text-slate-900 placeholder-slate-400"}`}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 pb-2 space-y-2">
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
          {sportsList.map((sport) => {
            const SportIcon = SPORT_ICON_MAP[sport.toLowerCase()];
            return (
              <button key={sport} onClick={() => setSelectedSport(sport)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] text-[10px] font-semibold uppercase whitespace-nowrap transition-all active:scale-95 ${selectedSport === sport ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {SportIcon && <SportIcon color={selectedSport === sport ? "white" : isDark ? "#94a3b8" : "#64748b"} size={14} />}
                {sport}
              </button>
            );
          })}
        </div>
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
          {communesList.map((commune) => (
            <button key={commune} onClick={() => setSelectedCommune(commune)}
              className={`px-3.5 py-2 rounded-[14px] text-[10px] font-semibold uppercase whitespace-nowrap transition-all active:scale-95 ${selectedCommune === commune ? "bg-emerald-500 text-white" : isDark ? "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {commune}
            </button>
          ))}
        </div>
      </div>

      <SectionPill label={`Resultados (${filteredVenues.length})`} />
      <div className="px-5 pb-8 space-y-4">
        {filteredVenues.map((venue) => {
          const data = venue as any;
          const allSports = (data.activeSports || data.sports || ["Multicancha"]) as string[];
          const vComuna = data.commune || data.comuna || "Santiago";
          const distance = calcDistance(venue);
          return (
            <GlowCard key={venue.id} isDark={isDark}>
              <button onClick={() => router.push(`/player/clubes/${venue.id}`)} className="w-full block text-left">
                <div className="h-[160px] rounded-[14px] overflow-hidden relative">
                  <img src={getVenueImage(venue)} alt={venue.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                    {allSports.slice(0, 3).map((s: string) => (
                      <span key={s} className="bg-emerald-500/90 px-2.5 py-1 rounded-[14px] text-white text-[8px] font-semibold tracking-wider uppercase">{s}</span>
                    ))}
                    {allSports.length > 3 && <span className="bg-emerald-500/90 px-2.5 py-1 rounded-[14px] text-white text-[8px] font-semibold">+{allSports.length - 3}</span>}
                  </div>
                </div>
              </button>
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-semibold truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{venue.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MapPin size={11} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      <span className={`text-xs font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{vComuna}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1.5 rounded-[14px] shrink-0">
                    <Star size={12} className="text-emerald-500" fill="currentColor" />
                    <span className="text-emerald-500 font-semibold text-xs">{Number(venue.rating || 0).toFixed(1)}</span>
                  </div>
                </div>
                <div className={`flex items-center justify-between pt-4 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
                  <div className="flex items-center gap-1.5">
                    <Navigation size={13} className="text-emerald-500" />
                    <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>{distance || "Cerca de ti"}</span>
                  </div>
                  <button onClick={() => router.push(`/player/clubes/${venue.id}`)}
                    className="bg-emerald-500 hover:bg-emerald-600 transition-all px-5 h-10 rounded-[14px] font-semibold text-xs text-white shadow-lg shadow-emerald-500/30 active:scale-[0.98]">
                    RESERVAR
                  </button>
                </div>
              </div>
            </GlowCard>
          );
        })}
        {filteredVenues.length === 0 && (
          <div className="py-16 flex flex-col items-center">
            <Compass size={32} className={isDark ? "text-slate-600" : "text-slate-300"} />
            <p className={`text-sm font-medium mt-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin recintos detectados</p>
          </div>
        )}
        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>
    </div>
  );
}
