"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft, Locate, Navigation, Star, Compass } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { venueService } from "@/services/player/venueService";
import { FutbolIcon, PadelIcon, TenisIcon, BasquetbolIcon, VoleibolIcon } from "@/components/icons/SportsIcons";

const MapView = dynamic(() => import("./MapComponent"), { ssr: false });

function SectionPill({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-6 mb-4 mt-2">
      <div className="h-[3px] w-6 rounded-full bg-emerald-500/60" />
      <span className="text-emerald-400 font-semibold text-[10px] tracking-[3px] uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
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

const getSportColor = (sportId: string) => {
  switch (sportId) {
    case "futbol": case "futbolito": return "#10b981";
    case "padel": return "#3b82f6";
    case "tenis": return "#f59e0b";
    case "basquet": return "#f97316";
    case "voley": return "#a855f7";
    default: return "#10b981";
  }
};

const CATEGORIAS = [
  { id: "todo", name: "Todos", icon: null },
  { id: "futbol", name: "Fútbol", icon: FutbolIcon },
  { id: "futbolito", name: "Futbolito", icon: FutbolIcon },
  { id: "padel", name: "Pádel", icon: PadelIcon },
  { id: "tenis", name: "Tenis", icon: TenisIcon },
  { id: "basquet", name: "Básquet", icon: BasquetbolIcon },
  { id: "voley", name: "Voley", icon: VoleibolIcon },
  { id: "entrenamiento", name: "Training", icon: null },
];

const extractCoords = (v: any) => {
  const target = v.location || v.coordinates || v.coords || v;
  const lat = target?.latitude ?? target?.lat ?? target?._lat ?? v.latitude ?? v.lat;
  const lng = target?.longitude ?? target?.lng ?? target?._long ?? v.longitude ?? v.lng;
  return { lat: parseFloat(lat), lng: parseFloat(lng) };
};

// Normalize sport names for deduplication
const normalizeSport = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function MapaPage() {
  const router = useRouter();
  const { theme } = usePlayer();
  const isDark = theme === "dark";

  const [activeSport, setActiveSport] = useState("todo");
  const [venues, setVenues] = useState<any[]>([]);
  const [rawVenues, setRawVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -33.4489, lng: -70.6693 });
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) { setGeoError(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }; setUserLocation(loc); setCenter({ lat: loc.latitude, lng: loc.longitude }); },
      () => { setGeoError(true); }, 
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => { venueService.getVenues().then(setRawVenues).catch(console.error).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (!rawVenues.length) return;
    const filtered = rawVenues.filter((v) => {
      if (activeSport === "todo") return true;
      const vs = [...(v.sports || []), ...(v.activeSports || []), ...(v.pricing ? Object.keys(v.pricing) : [])].map(normalizeSport);
      if (activeSport === "futbol") return vs.some((s) => s.includes("futbol") && !s.includes("futbolito"));
      if (activeSport === "futbolito") return vs.some((s) => s.includes("futbolito"));
      return vs.some((s) => s.includes(activeSport === "entrenamiento" ? "training" : activeSport.toLowerCase()));
    });
    const processed = filtered.map((v) => {
      const { lat, lng } = extractCoords(v);
      // Collect all sports, normalize, deduplicate by normalized name
      const rawSports = [...new Set([...(v.activeSports || v.sports || []), ...(v.pricing ? Object.keys(v.pricing) : [])].map((s: string) => s.trim()))];
      // Deduplicate by normalized name (keep first occurrence)
      const seen = new Set<string>();
      const ds = rawSports.filter((s: string) => {
        const n = normalizeSport(s);
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
      let dist = "Cerca";
      if (userLocation && !isNaN(lat) && !isNaN(lng)) dist = formatDistance(userLocation.latitude, userLocation.longitude, lat, lng);
      let ps = "todo";
      if (activeSport !== "todo") ps = activeSport;
      else if (ds.length > 0) {
        const f = normalizeSport(ds[0]);
        if (f.includes("futbolito")) ps = "futbolito";
        else if (f.includes("futbol")) ps = "futbol";
        else if (f.includes("padel")) ps = "padel";
        else if (f.includes("tenis")) ps = "tenis";
        else if (f.includes("basquet") || f.includes("basket")) ps = "basquet";
        else if (f.includes("voley")) ps = "voley";
      }
      return { ...v, lat, lng, displaySports: ds.length > 0 ? ds.join(" • ") : "Sesión", distance: dist, primarySportId: ps };
    }).filter((v: any) => !isNaN(v.lat) && !isNaN(v.lng));
    setVenues(processed);
  }, [rawVenues, activeSport, userLocation]);

  const activeCategories = useMemo(() => {
    if (!rawVenues.length) return [CATEGORIAS[0]];
    const a = new Set<string>();
    rawVenues.forEach((v) => {
      [...(v.sports || []), ...(v.activeSports || []), ...(v.pricing ? Object.keys(v.pricing) : [])].forEach((s: string) => {
        const n = normalizeSport(s);
        if (n.includes("futbolito")) a.add("futbolito");
        else if (n.includes("futbol")) a.add("futbol");
        if (n.includes("padel")) a.add("padel");
        if (n.includes("tenis")) a.add("tenis");
        if (n.includes("basquet") || n.includes("basket")) a.add("basquet");
        if (n.includes("voley")) a.add("voley");
        if (n.includes("entrenamiento") || n.includes("training")) a.add("entrenamiento");
      });
    });
    return CATEGORIAS.filter((c) => c.id === "todo" || a.has(c.id));
  }, [rawVenues]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getVenueImage = (v: any) => {
    const url = v.imageURL || v.imageUrl;
    if (url && (url.startsWith("http") || url.startsWith("data:image"))) return url;
    return "https://images.unsplash.com/photo-1599566150163-29194dcaad36";
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
      {/* Header */}
      <div className={`px-5 pt-12 pb-4 ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
            <ChevronLeft size={20} className="text-emerald-500" />
          </button>
          <h1 className="font-semibold text-base tracking-widest uppercase flex-1 text-center text-emerald-500">Mapa</h1>
          <button onClick={handleLocate} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
            <Locate size={18} className="text-emerald-500" />
          </button>
        </div>
        {geoError && (
          <p className="text-amber-400 text-[9px] font-medium text-center mb-2">No se pudo obtener tu ubicación. Usando Santiago por defecto.</p>
        )}
        {/* Filters */}
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
          {activeCategories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <button key={cat.id} onClick={() => setActiveSport(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[14px] text-[10px] font-semibold uppercase whitespace-nowrap transition-all active:scale-95 ${activeSport === cat.id ? "text-white" : isDark ? "text-slate-400 bg-white/[0.06] hover:bg-white/[0.1]" : "text-slate-500 bg-slate-100 hover:bg-slate-200"}`}
                style={activeSport === cat.id ? { backgroundColor: getSportColor(cat.id) } : {}}>
                {CatIcon && <CatIcon color={activeSport === cat.id ? "white" : isDark ? "#94a3b8" : "#64748b"} size={14} />}
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="px-4">
        <div className={`relative h-[380px] rounded-[14px] overflow-hidden border ${isDark ? "border-white/[0.06] shadow-lg shadow-black/30" : "border-slate-200 shadow-sm"}`}>
          <MapView venues={venues} center={center} isDark={isDark} />
        </div>
      </div>

      {/* Venue List */}
      <SectionPill label="Clubes Cercanos" />
      <div className="px-5 pb-8 space-y-4">
        {venues.length === 0 ? (
          <div className="py-16 flex flex-col items-center">
            <Compass size={32} className={isDark ? "text-slate-600" : "text-slate-300"} />
            <p className={`text-sm font-medium mt-3 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sin recintos detectados</p>
          </div>
        ) : (
          venues.map((v) => {
            const ds = v.displaySports.split(" • ");
            return (
              <button key={v.id} onClick={() => router.push(`/player/clubes/${v.id}`)} className="w-full text-left">
                <div className={`relative rounded-[14px] overflow-hidden border ${isDark ? "bg-[#0F172A]/90 backdrop-blur-xl border-white/[0.06]" : "bg-white/80 backdrop-blur-xl border-slate-200/60"} shadow-lg ${isDark ? "shadow-black/20" : "shadow-slate-200/50"}`}>
                  <div className="h-[160px] relative">
                    <img src={getVenueImage(v)} alt={v.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                      {ds.slice(0, 3).map((s: string) => (
                        <span key={s} className="bg-emerald-500/90 px-2.5 py-1 rounded-[14px] text-white text-[8px] font-semibold tracking-wider uppercase">{s}</span>
                      ))}
                      {ds.length > 3 && <span className="bg-emerald-500/90 px-2.5 py-1 rounded-[14px] text-white text-[8px] font-semibold">+{ds.length - 3}</span>}
                    </div>
                    <div className="absolute bottom-4 left-5 right-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-lg font-semibold uppercase truncate">{v.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-[14px]">
                              <Star size={10} className="text-emerald-500" fill="currentColor" />
                              <span className="text-emerald-500 text-[9px] font-semibold">{Number(v.rating || 0).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/15 px-3 py-2 rounded-[14px] flex items-center gap-1.5 border border-white/10 shrink-0 ml-3">
                          <Navigation size={11} className="text-white" />
                          <span className="text-white text-[10px] font-semibold">{v.distance}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
        <p className={`text-center text-[8px] font-medium pt-2 ${isDark ? "text-slate-600" : "text-slate-400"}`}>MVP Sports &bull; 2026</p>
      </div>
    </div>
  );
}
