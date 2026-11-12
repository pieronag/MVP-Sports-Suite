"use client";
// Ficha del recinto (jugador): reservar primero (deporte → día y hora → confirmar) y debajo la información del recinto.
// Reglas en utils/venueBooking; el precio es el mismo que cobran el checkout y el servidor (utils/pricing).
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/services/client/firebase";
import { venueService, type Court, type Tenant } from "@/services/client/player/venueService";
import { bookingService } from "@/services/client/player/bookingService";
import { usePlayer } from "@/context/PlayerContext";
import { useNow } from "@/hooks/useNow";
import { SportStep, StepIndicator, SummaryStep, TimeStep, sportStyle } from "@/components/player/venue/BookingFlow";
import { Gallery, RulesSheet, VenueAbout, VenueHeader, VenueReviews } from "@/components/player/venue/VenueInfo";
import {
  bookableSports, bookingDays, courtsForSport, distanceLabel, freeTimes, hoursOn, slotPrice, timesWithCourts, venueCoords, weekHours,
} from "@/utils/venueBooking";
import { canonicalSport } from "@/utils/sports";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { theme, profile } = usePlayer();
  const isDark = theme === "dark";
  const now = new Date(useNow(60_000));

  const [venue, setVenue] = useState<Tenant | null>(null);
  const [missing, setMissing] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState<string | null>(null);
  const [date, setDate] = useState(() => bookingDays(new Date(), 1)[0].date);
  const [time, setTime] = useState<string | null>(null);
  const [courtId, setCourtId] = useState<string | null>(null);
  const [taken, setTaken] = useState<{ key: string; byCourt: Record<string, string[]> } | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [gallery, setGallery] = useState<number | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setUserLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => {}, { timeout: 10_000 });
  }, []);

  // Recinto y canchas en vivo (cambios de tarifa, horario o mantenimiento se ven al tiro)
  useEffect(() => {
    if (!id) return;
    const offVenue = onSnapshot(doc(db, "tenants", id), (snap) => {
      if (snap.exists()) setVenue({ id: snap.id, ...snap.data() } as Tenant);
      else setMissing(true);
    }, () => setMissing(true));
    const offCourts = onSnapshot(query(collection(db, "courts"), where("tenantId", "==", id)), (snap) => setCourts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Court)));
    venueService.getVenueFeedback(id).then(setReviews).catch(() => {});
    return () => { offVenue(); offCourts(); };
  }, [id]);

  const sports = useMemo(() => bookableSports(venue), [venue]);
  const sportCourts = useMemo(() => (sport ? courtsForSport(courts as any[], sport) : []), [courts, sport]);
  const days = bookingDays(now, 14, venue);

  // Deporte inicial: el de "Reservar de nuevo" (?sport=), el único del recinto o el principal del jugador
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked || !sports.length) return;
    const wanted = params.get("sport") || (sports.length === 1 ? sports[0] : (profile as any)?.mainSport);
    const pick = sports.find((s) => canonicalSport(s) === canonicalSport(wanted));
    if (pick) { setSport(pick); setStep(2); } // eslint-disable-line react-hooks/set-state-in-effect -- una vez, cuando llegan los deportes
    setAutoPicked(true);
  }, [sports, profile, params, autoPicked]);

  // Horas tomadas de cada cancha del deporte ese día (una lectura por cancha, sin releer el recinto)
  const takenKey = `${date}|${sportCourts.map((c) => c.id).join(",")}`;
  useEffect(() => {
    if (step !== 2 || !sportCourts.length) return;
    let alive = true;
    Promise.all(sportCourts.map((c) => bookingService.getTakenTimes(c.id, date).then((t) => [c.id, t] as const).catch(() => [c.id, [] as string[]] as const)))
      .then((pairs) => { if (alive) setTaken({ key: takenKey, byCourt: Object.fromEntries(pairs) }); });
    return () => { alive = false; };
  }, [step, takenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceOf = (t: string) => (sport ? slotPrice(venue, sport, date, t) : 0);
  const minute = Math.floor(now.getTime() / 60_000); // los horarios que ya empezaron salen solos
  const loadingTimes = step === 2 && sportCourts.length > 0 && taken?.key !== takenKey;
  const rows = useMemo(() => {
    if (!venue || !sport || taken?.key !== takenKey) return [];
    const free = Object.fromEntries(sportCourts.map((c) => [c.id, freeTimes(venue, date, taken.byCourt[c.id] || [])]));
    // Sin tarifa publicada para esa hora no se ofrece (el pago la rechazaría)
    return timesWithCourts(sportCourts as any[], free, date, now).filter((r) => slotPrice(venue, sport, date, r.time) > 0);
  }, [venue, sport, sportCourts, taken, takenKey, date, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickSport = (s: string) => { setSport(s); setTime(null); setCourtId(null); setStep(2); };
  const pickDate = (d: string) => { setDate(d); setTime(null); setCourtId(null); };
  const pickTime = (t: string) => {
    setTime(t);
    const free = rows.find((r) => r.time === t)?.courts || [];
    if (!free.some((c) => c.id === courtId)) setCourtId(free[0]?.id || null);
  };

  // Si la hora elegida se ocupó o ya pasó, se vuelve a elegir
  const stillFree = !time || rows.some((r) => r.time === time && r.courts.some((c) => c.id === courtId));
  const court = courts.find((c) => c.id === courtId) as any;

  const confirm = () => {
    if (!sport || !time || !courtId || !venue) return;
    const q = new URLSearchParams({
      tenantId: id, tenantName: venue.name || "", courtId, courtName: court?.name || "", price: String(priceOf(time)),
      date, startTime: time, sport, sportColor: sportStyle(sport).color,
    });
    router.push(`/player/checkout?${q}`);
  };

  const v = venue as any;
  const coords = venueCoords(v);
  const rules: string[] = Array.isArray(v?.rules) ? v.rules : [];
  const images: string[] = Array.isArray(v?.gallery) ? v.gallery.filter(Boolean) : [];
  const bg = isDark ? "bg-[#020611]" : "bg-[#F8FAFC]";

  if (missing) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center ${bg}`}>
        <p className={`text-[15px] font-semibold ${isDark ? "text-slate-200" : "text-slate-800"}`}>No encontramos este recinto</p>
        <button onClick={() => router.push("/player/clubes")} className="px-5 h-11 rounded-md bg-emerald-500 text-white text-[13px] font-semibold">Ver recintos</button>
      </div>
    );
  }
  if (!venue) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${bg}`} role="status">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-600 dark:text-emerald-400 text-[12px] font-semibold">Cargando recinto</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      <VenueHeader venue={v} todayHours={hoursOn(v, days[0].date)} onBack={() => router.back()}
        distance={userLocation && coords ? distanceLabel(userLocation, coords) : null}
        mapsUrl={coords ? `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}` : null}
        onGallery={images.length ? () => setGallery(0) : null} />

      <div className="px-5 pt-5 pb-8 space-y-4">
        <h2 className={`text-[18px] font-heading font-black tracking-tight ${isDark ? "text-slate-100" : "text-slate-900"}`}>Reserva tu cancha</h2>
        <StepIndicator step={step} isDark={isDark} />
        {step === 1 && <SportStep isDark={isDark} sports={sports} selected={sport} onPick={pickSport} />}
        {step === 2 && sport && (
          <TimeStep isDark={isDark} days={days} date={date} onDate={pickDate} loading={loadingTimes} hasCourts={sportCourts.length > 0}
            rows={rows} time={stillFree ? time : null} onTime={pickTime} courtId={courtId} onCourt={setCourtId} priceOf={priceOf}
            onBack={() => setStep(1)} onNext={() => setStep(3)} />
        )}
        {step === 3 && sport && time && court && (
          stillFree ? (
            <SummaryStep isDark={isDark} sport={sport} court={court} date={date} time={time} price={priceOf(time)} onBack={() => setStep(2)} onConfirm={confirm} />
          ) : (
            <div role="alert" className="p-4 rounded-md border border-amber-500/30 bg-amber-500/10 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
              Ese horario ya no está disponible.{" "}
              <button onClick={() => { setTime(null); setStep(2); }} className="underline">Elegir otro</button>
            </div>
          )
        )}

        <VenueAbout isDark={isDark} venue={v} week={weekHours(v)} onRules={rules.length || v.cancellationPolicy ? () => setShowRules(true) : null} />
        <VenueReviews isDark={isDark} reviews={reviews} />
      </div>

      {showRules && <RulesSheet isDark={isDark} rules={rules} policy={v.cancellationPolicy} onClose={() => setShowRules(false)} />}
      {gallery !== null && <Gallery images={images} index={gallery} onIndex={setGallery} onClose={() => setGallery(null)} />}
    </div>
  );
}
