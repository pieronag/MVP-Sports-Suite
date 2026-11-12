"use client";
// Estadísticas del jugador: rango, cómo se gana XP y la bitácora de partidos y logros.
// La XP de cada partido sale de utils/gamificationCalc (las mismas reglas con que el servidor calcula el total).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addDoc, collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { ChevronLeft, Plus, TrendingUp } from "@/components/player/icons";
import { GlowCard, SectionPill, SegmentedTabs } from "@/components/player/ui";
import { BadgeCard, BodyStats, MatchCard, RankCard, XpRules } from "@/components/player/stats/StatsViews";
import { MatchReportSheet } from "@/components/player/stats/MatchReportSheet";
import { usePlayer } from "@/context/PlayerContext";
import { useNow } from "@/hooks/useNow";
import { db } from "@/services/client/firebase";
import { postApi } from "@/services/client/apiClient";
import { cached, invalidate } from "@/services/client/player/cache";
import { bookingService, type Booking } from "@/services/client/player/bookingService";
import { normalizeSettings, xpValues } from "@/utils/gamificationCalc";
import { badgeList, matchFeed, rankProgress, reportPayload, type ReportDraft } from "@/utils/playerStats";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function EstadisticasPage() {
  const router = useRouter();
  const params = useSearchParams();
  const now = new Date(useNow());
  const { profile, theme } = usePlayer();
  const isDark = theme === "dark";
  const p = (profile || {}) as any;
  const uid: string = p.uid || "";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cfg, setCfg] = useState(() => normalizeSettings({}));
  const [tab, setTab] = useState<"partidos" | "logros">("partidos");
  const [visible, setVisible] = useState(10);
  const [report, setReport] = useState<{ match: any | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    try { setBookings(await bookingService.getUserBookings(uid)); }
    catch (e) { console.error("Partidos", e); }
    finally { setLoading(false); }
  }, [uid]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- carga inicial
  useEffect(() => {
    // Ajustes de XP: casi nunca cambian, lectura con caché
    cached("settings-global", 10 * 60_000, () => getDoc(doc(db, "settings", "global")))
      .then((s) => { if (s.exists()) setCfg(normalizeSettings(s.data())); })
      .catch(() => {});
  }, []);

  const minute = Math.floor(now.getTime() / 60_000);
  const feed = useMemo(() => (uid ? matchFeed(bookings, uid, p, cfg, now) : []), [bookings, uid, p, cfg, minute]); // eslint-disable-line react-hooks/exhaustive-deps
  const badges = useMemo(() => badgeList(p.badges, cfg), [p.badges, cfg]);
  const xp = Number(p.xp) || 0;
  const rank = rankProgress(xp, cfg);

  // "Anotar resultado" desde una notificación: ?registrar=<reserva>
  const [autoOpened, setAutoOpened] = useState(false);
  useEffect(() => {
    const id = params.get("registrar");
    if (autoOpened || loading || !id) return;
    const item = feed.find((f) => f.id === id && f.canReport);
    if (item) setReport({ match: item.booking }); // eslint-disable-line react-hooks/set-state-in-effect -- abrir una vez desde el enlace
    setAutoOpened(true);
  }, [feed, loading, params, autoOpened]);

  const save = async (draft: ReportDraft, names: Record<string, string>, mvpUserId: string | null, teamName: string) => {
    if (!uid || !report) return;
    setSaving(true); setSaveError(null);
    try {
      const sport = report.match?.sport || "Fútbol";
      const data = reportPayload(draft, uid, sport, names, mvpUserId);
      if (report.match?.id) await updateDoc(doc(db, "bookings", report.match.id), data);
      else await addDoc(collection(db, "bookings"), { ...data, userId: uid, sport, status: "completed", date: new Date(), isInternalMatch: true, tenantName: `PARTIDO INTERNO: ${teamName || "Mi equipo"}` });
      // El servidor recalcula a todos los que jugaron (los partidos internos no suman, pero sí ajustan las estadísticas de equipo)
      await postApi("/api/players/recompute", { uids: [uid, ...((data as any).participantIds || [])] }).catch(() => undefined);
      setReport(null);
      invalidate("bookings:"); // la lista de partidos tiene caché de 1 minuto
      await load();
    } catch (e) {
      console.error("Guardar resultado", e);
      setSaveError((e as { code?: string })?.code === "permission-denied" ? "No puedes anotar el resultado de este partido." : "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const bg = isDark ? "bg-[#020611]" : "bg-[#F8FAFC]";
  if (loading && uid) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${bg}`} role="status">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-emerald-600 dark:text-emerald-400 text-[12px] font-semibold">Cargando estadísticas</p>
      </div>
    );
  }

  const list = tab === "partidos" ? feed : badges;
  return (
    <div className={`min-h-screen ${bg}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${bg}`}>
        <button aria-label="Volver" onClick={() => router.back()} className={`w-10 h-10 rounded-md flex items-center justify-center active:scale-90 ${isDark ? "bg-white/6" : "bg-slate-100"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[18px] tracking-tight flex-1 text-center">Estadísticas</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3 pb-8 space-y-5">
        <SectionPill label="Progreso" />
        <RankCard isDark={isDark} rank={rank} xp={xp} ovr={Number(p.ovr) || 0} />
        <SectionPill label="Datos físicos" />
        <BodyStats isDark={isDark} profile={p} />
        <SectionPill label="Cómo ganar XP" />
        <XpRules isDark={isDark} x={xpValues(p, cfg)} />

        <SegmentedTabs isDark={isDark} value={tab} onChange={(t) => { setTab(t); setVisible(10); }} options={[
          { id: "partidos", label: `Partidos (${feed.length})` },
          { id: "logros", label: `Logros (${badges.length})` },
        ]} />

        {tab === "partidos" && (
          <button onClick={() => { setSaveError(null); setReport({ match: null }); }} className="w-full h-11 rounded-md bg-emerald-500 text-white text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98]">
            <Plus size={16} /> Registrar partido interno
          </button>
        )}

        <GlowCard isDark={isDark}>
          <div className="p-5">
            {list.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center">
                <TrendingUp size={28} className={isDark ? "text-slate-600" : "text-slate-300"} />
                <p className={`text-[13px] font-medium mt-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {tab === "partidos" ? "Aún no tienes partidos jugados. Reserva una cancha y empieza a sumar." : "Aún no tienes logros. Se desbloquean jugando."}
                </p>
                {tab === "partidos" && <button onClick={() => router.push("/player/clubes")} className="mt-4 px-5 h-11 rounded-md bg-emerald-500 text-white text-[13px] font-semibold">Reservar cancha</button>}
              </div>
            ) : (
              <div className="space-y-3">
                {tab === "partidos"
                  ? feed.slice(0, visible).map((item) => <MatchCard key={item.id} isDark={isDark} item={item} onReport={() => { setSaveError(null); setReport({ match: item.booking }); }} />)
                  : badges.map((b) => <BadgeCard key={b.id} isDark={isDark} badge={b} />)}
                {tab === "partidos" && feed.length > visible && (
                  <button onClick={() => setVisible((v) => v + 10)} className={`w-full h-12 rounded-md font-semibold text-[13px] ${isDark ? "bg-white/4 text-emerald-400" : "bg-slate-100 text-emerald-700"}`}>
                    Ver 10 más
                  </button>
                )}
              </div>
            )}
          </div>
        </GlowCard>
      </div>

      {report && (
        <MatchReportSheet isDark={isDark} uid={uid} match={report.match} saving={saving} error={saveError}
          onSave={save} onClose={() => setReport(null)} />
      )}
    </div>
  );
}
