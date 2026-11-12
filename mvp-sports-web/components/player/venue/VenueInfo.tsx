"use client";
// Ficha del recinto (jugador): cabecera, datos de contacto y horario, reseñas, reglas y galería.
import { useEffect, type ReactNode } from "react";
import { hideBrokenImg } from "@/utils/img";
import WhatsappLogo from "@/components/icons/WhatsappLogo";
import { GlowCard, SectionPill } from "@/components/player/ui";
import { Ban, ChevronLeft, ChevronRight, Clock, CreditCard, Globe, Images, Navigation, Phone, Star, X } from "@/components/player/icons";

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
const muted = (d: boolean) => (d ? "text-slate-400" : "text-slate-500");
const FALLBACK = "https://images.unsplash.com/photo-1574629810360-7efbbe195018";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
}

export function VenueHeader({ venue, distance, todayHours, mapsUrl, onBack, onGallery }: {
  venue: any; distance: string | null; todayHours: string; mapsUrl: string | null; onBack: () => void; onGallery: (() => void) | null;
}) {
  const glass = "w-11 h-11 rounded-md bg-black/45 backdrop-blur-sm border border-white/10 flex items-center justify-center";
  return (
    <div className="h-[176px] relative overflow-hidden">
      <img src={venue?.imageURL || venue?.imageUrl || FALLBACK} referrerPolicy="no-referrer" onError={hideBrokenImg} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/45 to-black/20" />
      <div className="absolute top-12 left-5 right-5 flex items-center justify-between z-10">
        <button aria-label="Volver" onClick={onBack} className={glass}><ChevronLeft size={20} className="text-white" /></button>
        <div className="flex gap-2">
          {onGallery && <button aria-label="Ver fotos" onClick={onGallery} className={glass}><Images size={18} className="text-white" /></button>}
          {mapsUrl && <a aria-label="Cómo llegar" href={mapsUrl} target="_blank" rel="noopener noreferrer" className={glass}><Navigation size={18} className="text-white" /></a>}
        </div>
      </div>
      <div className="absolute bottom-4 left-5 right-5">
        <h1 className="text-white text-[22px] font-heading font-black tracking-tight leading-tight line-clamp-2">{venue?.name}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-white/85 text-[12px] font-medium">
          <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" fill="currentColor" />{Number(venue?.rating) > 0 ? Number(venue.rating).toFixed(1) : "Nuevo"}</span>
          {distance && <><span aria-hidden>·</span><span>{distance}</span></>}
          {todayHours && <><span aria-hidden>·</span><span className="flex items-center gap-1"><Clock size={12} />Hoy {todayHours}</span></>}
        </p>
      </div>
    </div>
  );
}

function Contact({ href, icon, label, isDark }: { href: string; icon: ReactNode; label: string; isDark: boolean }) {
  return (
    <a href={href} target={href.startsWith("tel:") ? undefined : "_blank"} rel="noopener noreferrer"
      className={`flex items-center gap-1.5 h-9 px-3 rounded-md border text-[12px] font-semibold ${isDark ? "border-white/8 text-slate-300" : "border-slate-200 text-slate-600"}`}>
      {icon}{label}
    </a>
  );
}

export function VenueAbout({ isDark, venue, week, onRules }: { isDark: boolean; venue: any; week: string[]; onRules: (() => void) | null }) {
  const web = venue?.website ? (String(venue.website).startsWith("http") ? venue.website : `https://${venue.website}`) : null;
  return (
    <>
      <SectionPill label="Sobre el recinto" />
      <GlowCard isDark={isDark}>
        <div className="p-5 space-y-4">
          {venue?.description && <p className={`text-[13px] leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>{venue.description}</p>}
          {week.length > 0 && (
            <div>
              <p className={`text-[11px] font-semibold mb-1 ${muted(isDark)}`}>Horario</p>
              <ul className={`text-[12px] font-medium space-y-0.5 ${isDark ? "text-slate-200" : "text-slate-700"}`}>{week.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {venue?.phone && <Contact isDark={isDark} href={`tel:${venue.phone}`} icon={<Phone size={13} className="text-emerald-500" />} label={venue.phone} />}
            {venue?.whatsapp && <Contact isDark={isDark} href={`https://wa.me/${String(venue.whatsapp).replace(/\D/g, "")}`} icon={<WhatsappLogo className="w-3.5 h-3.5 text-emerald-500" />} label="WhatsApp" />}
            {venue?.instagram && <Contact isDark={isDark} href={`https://instagram.com/${String(venue.instagram).replace(/^@/, "")}`} icon={<Globe size={13} className="text-emerald-500" />} label="Instagram" />}
            {web && <Contact isDark={isDark} href={web} icon={<Globe size={13} className="text-emerald-500" />} label="Web" />}
          </div>
          {(venue?.isMercadopagoActive || venue?.amenities?.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {venue?.isMercadopagoActive && (
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12px] font-semibold ${isDark ? "border-white/6 bg-white/4 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  <CreditCard size={11} className="text-emerald-500" />Mercado Pago
                </span>
              )}
              {(venue?.amenities || []).map((a: string) => (
                <span key={a} className={`px-3 py-1 rounded-md border text-[11px] font-medium ${isDark ? "border-white/6 bg-white/3 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{a}</span>
              ))}
            </div>
          )}
          {onRules && (
            <button onClick={onRules} className={`w-full h-11 rounded-md font-semibold text-[12px] flex items-center justify-center gap-2 border active:scale-[0.98] ${isDark ? "border-white/8 bg-white/4 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
              <Ban size={14} /> Reglas y política de cancelación
            </button>
          )}
        </div>
      </GlowCard>
    </>
  );
}

export function VenueReviews({ isDark, reviews }: { isDark: boolean; reviews: any[] }) {
  return (
    <>
      <SectionPill label={reviews.length ? `Reseñas (${reviews.length})` : "Reseñas"} />
      <GlowCard isDark={isDark}>
        {reviews.length ? (
          <ul className="divide-y divide-emerald-500/5">
            {reviews.slice(0, 5).map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-center gap-1 mb-1" aria-label={`${r.rating || 0} de 5 estrellas`}>
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={11} className={s <= (r.rating || 0) ? "text-amber-500" : isDark ? "text-slate-600" : "text-slate-200"} fill={s <= (r.rating || 0) ? "currentColor" : "none"} />)}
                  <span className={`text-[11px] font-medium ml-1.5 ${muted(isDark)}`}>{r.userName || "Jugador"}</span>
                </div>
                {r.comment && <p className={`text-[12px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{r.comment}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 flex flex-col items-center">
            <Star size={28} className={isDark ? "text-slate-600" : "text-slate-300"} />
            <p className={`text-[12px] font-semibold mt-3 ${muted(isDark)}`}>Aún no hay reseñas. Juega aquí y deja la primera.</p>
          </div>
        )}
      </GlowCard>
    </>
  );
}

export function RulesSheet({ isDark, rules, policy, onClose }: { isDark: boolean; rules: string[]; policy?: string; onClose: () => void }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-[2px] sm:px-5 sm:py-6 animate-in fade-in duration-200" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Reglas del recinto" onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-sm rounded-t-xl sm:rounded-md border pb-[env(safe-area-inset-bottom,0px)] ${isDark ? "bg-[#0A101D] border-white/6" : "bg-white border-slate-200"}`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? "border-white/6" : "border-slate-200"}`}>
          <p className={`font-semibold text-[14px] ${isDark ? "text-slate-100" : "text-slate-900"}`}>Reglas del recinto</p>
          <button aria-label="Cerrar" onClick={onClose} className={`w-9 h-9 rounded-md flex items-center justify-center ${isDark ? "bg-white/6" : "bg-slate-100"}`}><X size={14} /></button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
          {rules.map((rule) => (
            <div key={rule} className={`flex items-start gap-3 p-3 rounded-md border ${isDark ? "border-white/6" : "border-slate-200"}`}>
              <Ban size={14} className="text-red-400 shrink-0 mt-0.5" />
              <span className={`text-[12px] font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>{rule}</span>
            </div>
          ))}
          {policy && (
            <div className={`p-4 rounded-md border ${isDark ? "bg-amber-500/5 border-amber-500/10" : "bg-amber-50 border-amber-200"}`}>
              <p className={`text-[12px] font-semibold mb-1 ${isDark ? "text-amber-400" : "text-amber-700"}`}>Política de cancelación</p>
              <p className={`text-[12px] font-medium leading-snug ${isDark ? "text-slate-300" : "text-slate-700"}`}>{policy}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Gallery({ images, index, onIndex, onClose }: { images: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  useEscape(onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [index, images.length, onIndex]);
  const nav = "w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center";
  return (
    <div role="dialog" aria-modal="true" aria-label="Fotos del recinto" className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button aria-label="Cerrar" onClick={onClose} className="absolute top-12 right-5 z-10 w-11 h-11 rounded-md bg-white/10 border border-white/20 flex items-center justify-center"><X size={20} className="text-white" /></button>
      <div className="w-full max-w-lg px-5" onClick={(e) => e.stopPropagation()}>
        <img src={images[index]} alt={`Foto ${index + 1} de ${images.length}`} className="w-full h-auto max-h-[70vh] object-contain rounded-md" />
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-4 mt-5">
            <button aria-label="Foto anterior" onClick={() => onIndex((index - 1 + images.length) % images.length)} className={nav}><ChevronLeft size={16} className="text-white" /></button>
            <span className="text-white/70 text-[12px] font-medium tabular-nums">{index + 1} / {images.length}</span>
            <button aria-label="Foto siguiente" onClick={() => onIndex((index + 1) % images.length)} className={nav}><ChevronRight size={16} className="text-white" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
