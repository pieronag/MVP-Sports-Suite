"use client";
// Partidos: buscar rival (equipos), jugadores disponibles y partidos que buscan gente, y "Mis partidos"
// (mis publicaciones y mis retos). Las piezas viven en components/player/matchmaking y la lógica en utils/matchmaking.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, CheckCircle2, MessageCircle, Swords, User, Users, X } from "@/components/player/icons";
import { SectionPill, SegmentedTabs } from "@/components/player/ui";
import TeamDetailModal from "@/components/player/matchmaking/TeamDetailModal";
import PlayerDetailModal from "@/components/player/matchmaking/PlayerDetailModal";
import { ConfirmSheet, ResultSheet } from "@/components/player/matchmaking/Sheet";
import { EditEntrySheet, PublishPlayerSheet, PublishTeamSheet } from "@/components/player/matchmaking/PublishSheets";
import {
  ChallengeCard, ChallengeDetailSheet, Empty, FilterBar, MyEntryCard, NeedCard, PlayerCard, RivalCard, TeamPickerSheet, type Filters,
} from "@/components/player/matchmaking/Cards";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { matchmakingService, type Challenge, type MatchEntry } from "@/services/client/player/matchmakingService";
import { teamService } from "@/services/client/player/teamService";
import { REGIONS } from "@/utils/chileRegions";
import { inZone, matchSport, widenSearch } from "@/utils/matchmaking";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Tab = "rival" | "jugadores" | "mis";
type Team = { id: string; name: string; sport?: string; members?: string[]; ownerId?: string; imageUrl?: string };
type TeamData = { team: any; profiles: Record<string, any> } | null;
type Modal =
  | { kind: "publishTeam" } | { kind: "publishPlayer" } | { kind: "edit"; entry: MatchEntry } | { kind: "close"; entry: MatchEntry }
  | { kind: "team"; entry: MatchEntry } | { kind: "player"; entry: MatchEntry } | { kind: "pickTeam"; entry: MatchEntry }
  | { kind: "challenge"; entry: MatchEntry; team: Team } | { kind: "challengeDetail"; c: Challenge }
  | { kind: "answer"; c: Challenge; accept: boolean } | null;

const fold = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const TABS: Tab[] = ["rival", "jugadores", "mis"];

export default function PartidosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const uid = user?.uid || "";
  const p = (profile || {}) as any;
  const me = { name: p.displayName || "Jugador", photo: p.photoURL || "", position: p.position || "", ovr: p.ovr || 40, tier: p.tier || "Bronce" };

  const initialTab = searchParams.get("tab") as Tab;
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab) ? initialTab : "rival");
  const [filters, setFilters] = useState<Filters>({ sport: "", position: "", region: "", communes: [] });
  const [zoneOpen, setZoneOpen] = useState(false);

  // Cada listado recuerda para qué deporte llegó: si el filtro cambió, aún está cargando
  const [teamsFor, setTeamsFor] = useState<{ sport: string; list: MatchEntry[] } | null>(null);
  const [playersFor, setPlayersFor] = useState<{ sport: string; list: MatchEntry[] } | null>(null);
  const [needs, setNeeds] = useState<MatchEntry[]>([]);
  const [myEntries, setMyEntries] = useState<MatchEntry[] | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);

  const [modal, setModal] = useState<Modal>(null);
  const [teamData, setTeamData] = useState<TeamData>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const close = () => { setModal(null); setTeamData(null); };
  const fail = (msg: string) => setResult({ type: "error", msg });

  // Filtros iniciales desde el perfil: deporte principal y la comuna donde vive
  const [prefsApplied, setPrefsApplied] = useState(false);
  useEffect(() => {
    if (prefsApplied || !profile) return;
    const sport = matchSport(p.mainSport) || "";
    let region = "", communes: string[] = [];
    const city = fold(p.city);
    if (city) for (const [r, list] of Object.entries(REGIONS)) {
      const c = list.find((x) => fold(x) === city);
      if (c) { region = r; communes = [c]; break; }
    }
    // Una sola vez, cuando llega el perfil (asíncrono): no hay forma de derivarlo en el render sin pisar lo que el jugador elija
    setFilters((f) => ({ ...f, sport, region, communes })); // eslint-disable-line react-hooks/set-state-in-effect
    setPrefsApplied(true);
  }, [profile, prefsApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escuchas: los listados dependen del deporte (filtra el servidor); la zona y la posición se filtran aquí
  useEffect(() => {
    if (!uid) return;
    const sport = filters.sport;
    return matchmakingService.subscribeToTeamsLooking(sport || undefined, (e) => setTeamsFor({ sport, list: e.filter((x) => x.userId !== uid) }));
  }, [uid, filters.sport]);
  useEffect(() => {
    if (!uid || tab !== "jugadores") return;
    const sport = filters.sport;
    matchmakingService.getNeeds().then(setNeeds).catch(() => setNeeds([]));
    return matchmakingService.subscribeToPlayersAvailable(sport || undefined, (e) => setPlayersFor({ sport, list: e.filter((x) => x.userId !== uid) }));
  }, [uid, tab, filters.sport]);
  useEffect(() => {
    if (!uid) return;
    const offs = [
      matchmakingService.subscribeToMyEntries(uid, setMyEntries),
      matchmakingService.subscribeToMyChallenges(uid, setChallenges),
    ];
    teamService.getUserTeams(uid).then((t) => setUserTeams(t as Team[])).catch(() => {});
    return () => offs.forEach((off) => off());
  }, [uid]);

  const zoneOk = useCallback((e: MatchEntry) => inZone(e, filters.region, filters.communes), [filters.region, filters.communes]);
  const teams = teamsFor?.sport === filters.sport ? teamsFor.list : null;
  const players = playersFor?.sport === filters.sport ? playersFor.list : null;
  const visibleTeams = useMemo(() => teams?.filter(zoneOk) ?? null, [teams, zoneOk]);
  const visiblePlayers = useMemo(() => players?.filter((e) => zoneOk(e) && (!filters.position || e.position === filters.position)) ?? null, [players, zoneOk, filters.position]);
  const visibleNeeds = useMemo(() => needs.filter((e) => e.userId !== uid && (!filters.sport || fold(e.sport) === fold(filters.sport)) && zoneOk(e)), [needs, uid, filters.sport, zoneOk]);

  const activeMine = (myEntries || []).filter((e) => e.status === "active");
  const myPlayerEntry = activeMine.find((e) => e.type === "player");
  const captainTeams = userTeams.filter((t) => t.ownerId === uid);
  const publishedTeamIds = new Set(activeMine.filter((e) => e.type === "team").map((e) => e.teamId));
  const publishableTeams = captainTeams.filter((t) => !publishedTeamIds.has(t.id));
  const widen = widenSearch(filters);
  const widenAction = widen ? { label: widen.label, onClick: () => setFilters((f) => ({ ...f, ...widen.next })) } : null;

  const loadTeam = async (teamId?: string) => {
    setTeamData(null);
    if (!teamId) return;
    try {
      const team = await teamService.getTeamById(teamId);
      if (team) setTeamData({ team, profiles: await teamService.getMemberProfiles(team.members) });
    } catch { /* la ficha se queda cargando; el resto sigue usable */ }
  };

  const run = async (fn: () => Promise<void>, errorMsg: string) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { fail(e?.message && !/firebase|permission/i.test(e.message) ? e.message : errorMsg); }
    finally { setBusy(false); }
  };

  const publishTeam = (d: { team: Team; sport: string; description: string; region: string; communes: string[] }) => run(async () => {
    await matchmakingService.publishTeam({
      teamId: d.team.id, teamName: d.team.name, teamImageUrl: d.team.imageUrl, sport: d.sport,
      memberCount: d.team.members?.length || 1, description: d.description, region: d.region, communes: d.communes,
    }, uid);
    close();
    setResult({ type: "success", msg: "¡Equipo publicado! Ahora otros capitanes pueden retarte." });
  }, "No se pudo publicar el equipo.");

  const publishPlayer = (d: { sports: string[]; description: string; region: string; communes: string[] }) => run(async () => {
    await matchmakingService.publishPlayer({
      userId: uid, displayName: me.name, position: me.position || "Jugador", ovr: me.ovr, tier: me.tier,
      ...(me.photo ? { photoURL: me.photo } : {}), ...d,
    });
    close();
    setResult({ type: "success", msg: "¡Disponibilidad publicada! Los capitanes podrán contactarte." });
  }, "No se pudo publicar tu disponibilidad.");

  const saveEdit = (entry: MatchEntry, data: { description: string; sports?: string[] }) => run(async () => {
    await matchmakingService.updateEntry(entry.id, data);
    close();
    setResult({ type: "success", msg: "Publicación actualizada." });
  }, "No se pudo actualizar la publicación.");

  const closeEntry = (entry: MatchEntry) => run(async () => {
    await matchmakingService.closeEntry(entry.id);
    close();
  }, "No se pudo retirar la publicación.");

  const askChallenge = (entry: MatchEntry) => {
    if (!entry.teamId) return;
    if (captainTeams.length === 0) { fail("Debes ser capitán de un equipo para retar."); return; }
    setModal(captainTeams.length === 1 ? { kind: "challenge", entry, team: captainTeams[0] } : { kind: "pickTeam", entry });
  };

  const challenge = (entry: MatchEntry, team: Team) => run(async () => {
    await matchmakingService.createChallenge({
      type: "team_vs_team", challengerTeamId: team.id, challengerTeamName: team.name,
      challengedTeamId: entry.teamId, challengedTeamName: entry.teamName || "", sport: entry.sport,
      senderId: uid, receiverId: entry.userId || "",
    });
    close();
    setResult({ type: "success", msg: `¡Has retado a ${entry.teamName}! Te avisaremos cuando responda.` });
  }, "No se pudo enviar el reto.");

  const openChat = (data: Parameters<typeof matchmakingService.createChallenge>[0]) => run(async () => {
    const id = await matchmakingService.createChallenge(data);
    close();
    router.push(`/player/equipos/partidos/chat?id=${id}`);
  }, "No pudimos abrir el chat. Intenta de nuevo.");

  const answer = (c: Challenge, accept: boolean) => run(async () => {
    if (accept) await matchmakingService.acceptChallenge(c.id);
    else await matchmakingService.declineChallenge(c.id);
    close();
    if (accept) router.push(`/player/equipos/partidos/chat?id=${c.id}`);
    else setResult({ type: "success", msg: "Reto rechazado. El otro equipo verá tu respuesta." });
  }, accept ? "No se pudo aceptar el reto." : "No se pudo rechazar el reto.");

  const spinner = <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  const wasChallenged = (e: MatchEntry) => challenges.some((c) => c.status !== "declined"
    && ((c.challengedTeamId === e.teamId && c.senderId === uid) || (c.challengerTeamId === e.teamId && c.receiverId === uid)));
  const wasContacted = (e: MatchEntry) => challenges.some((c) => c.status !== "closed" && c.playerId === e.userId && c.senderId === uid);
  const pendingAnswers = challenges.filter((c) => c.receiverId === uid && c.status === "pending").length;
  const bigBtn = "w-full h-[52px] rounded-md bg-emerald-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
      <div className={`sticky top-0 z-20 px-5 pt-12 pb-4 flex items-center justify-between gap-3 ${isDark ? "bg-[#020611]" : "bg-[#F8FAFC]"}`}>
        <button aria-label="Volver" onClick={() => router.push("/player/equipos")} className={`w-10 h-10 rounded-md flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/6 hover:bg-white/10" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <h1 className="font-heading font-black text-[18px] tracking-tight flex-1 text-center">Partidos</h1>
        <div className="w-10" />
      </div>

      <div className="px-5 pt-3">
        <SegmentedTabs isDark={isDark} value={tab} onChange={setTab} options={[
          { id: "rival", label: "Buscar rival", icon: Swords },
          { id: "jugadores", label: "Jugadores", icon: Users },
          { id: "mis", label: pendingAnswers ? `Mis partidos (${pendingAnswers})` : "Mis partidos", icon: MessageCircle },
        ]} />
      </div>

      <div className="px-5 pt-4 pb-8 space-y-4">
        {tab !== "mis" && (
          <FilterBar isDark={isDark} filters={filters} onChange={setFilters} showPosition={tab === "jugadores" && !!filters.sport}
            zoneOpen={zoneOpen} onToggleZone={() => setZoneOpen((v) => !v)} />
        )}

        {tab === "rival" && (
          <>
            <button onClick={() => setModal({ kind: "publishTeam" })} className={bigBtn}><Swords size={16} /> Publicar mi equipo</button>
            {visibleTeams === null ? spinner : visibleTeams.length === 0 ? (
              <Empty isDark={isDark} icon={<Swords size={40} strokeWidth={1} />} text="No hay equipos buscando rival con estos filtros" action={widenAction} />
            ) : (
              <div className="space-y-3">
                {visibleTeams.map((e) => (
                  <RivalCard key={e.id} isDark={isDark} entry={e} challenged={wasChallenged(e)} onOpen={() => { setModal({ kind: "team", entry: e }); loadTeam(e.teamId); }} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "jugadores" && (
          <>
            {visibleNeeds.length > 0 && (
              <section aria-label="Partidos que buscan jugadores" className="space-y-2">
                <p className={`text-[12px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Partidos que buscan jugadores</p>
                {visibleNeeds.map((e) => (
                  <NeedCard key={e.id} isDark={isDark} entry={e} busy={busy} onJoin={() => openChat({
                    type: "captain_to_player", captainId: e.userId, captainName: e.displayName || "Organizador",
                    playerId: uid, playerName: me.name, sport: e.sport || "Fútbol", senderId: uid, receiverId: e.userId || "",
                  })} />
                ))}
              </section>
            )}
            {myPlayerEntry ? (
              <button onClick={() => setModal({ kind: "edit", entry: myPlayerEntry })} className={`${bigBtn} bg-transparent! text-emerald-600 dark:text-emerald-400 border border-emerald-500/40`}>
                <CheckCircle2 size={16} /> Ya estás disponible · Editar
              </button>
            ) : (
              <button onClick={() => setModal({ kind: "publishPlayer" })} className={bigBtn}><User size={16} /> Estoy disponible</button>
            )}
            {visiblePlayers === null ? spinner : visiblePlayers.length === 0 ? (
              <Empty isDark={isDark} icon={<Users size={40} strokeWidth={1} />} text="No hay jugadores disponibles con estos filtros" action={widenAction} />
            ) : (
              <div className="space-y-3">
                {visiblePlayers.map((e) => <PlayerCard key={e.id} isDark={isDark} entry={e} contacted={wasContacted(e)} onOpen={() => setModal({ kind: "player", entry: e })} />)}
              </div>
            )}
          </>
        )}

        {tab === "mis" && (myEntries === null ? spinner : (
          <div className="space-y-4">
            {activeMine.length > 0 && (
              <>
                <SectionPill label="Mis publicaciones" />
                {activeMine.map((e) => (
                  <MyEntryCard key={e.id} isDark={isDark} entry={e}
                    onEdit={e.type !== "need" ? () => setModal({ kind: "edit", entry: e }) : undefined}
                    onClose={() => setModal({ kind: "close", entry: e })} />
                ))}
              </>
            )}
            {challenges.length > 0 && (
              <>
                <SectionPill label="Mis retos y chats" />
                {challenges.map((c) => (
                  <ChallengeCard key={c.id} isDark={isDark} c={c} uid={uid}
                    onOpen={() => { setModal({ kind: "challengeDetail", c }); loadTeam(c.senderId === uid ? c.challengedTeamId : c.challengerTeamId); }}
                    onChat={() => router.push(`/player/equipos/partidos/chat?id=${c.id}`)} />
                ))}
              </>
            )}
            {activeMine.length === 0 && challenges.length === 0 && (
              <Empty isDark={isDark} icon={<MessageCircle size={40} strokeWidth={1} />} text={<>Aún no tienes partidos.<br />Publica tu equipo o tu disponibilidad.</>}
                action={{ label: "Buscar rival", onClick: () => setTab("rival") }} />
            )}
          </div>
        ))}
      </div>

      {modal?.kind === "publishTeam" && (
        <PublishTeamSheet isDark={isDark} teams={publishableTeams} hasAnyTeam={captainTeams.length > 0} busy={busy}
          zone={{ region: filters.region, communes: filters.communes }} onSubmit={publishTeam} onClose={close} />
      )}
      {modal?.kind === "publishPlayer" && (
        <PublishPlayerSheet isDark={isDark} me={me} busy={busy} initialSports={filters.sport ? [filters.sport] : matchSport(p.mainSport) ? [matchSport(p.mainSport)!] : []}
          zone={{ region: filters.region, communes: filters.communes }} onSubmit={publishPlayer} onClose={close} />
      )}
      {modal?.kind === "edit" && <EditEntrySheet isDark={isDark} entry={modal.entry} busy={busy} onSubmit={(d) => saveEdit(modal.entry, d)} onClose={close} />}
      {modal?.kind === "close" && (
        <ConfirmSheet isDark={isDark} tone="danger" icon={<X size={28} className="text-red-500" />} title="¿Retirar publicación?"
          message={<>{modal.entry.type === "team" ? modal.entry.teamName : modal.entry.type === "need" ? "La búsqueda de jugadores" : "Tu disponibilidad como jugador"} dejará de aparecer en Partidos.</>}
          confirmLabel="Retirar" cancelLabel="Volver" busy={busy} onConfirm={() => closeEntry(modal.entry)} onClose={close} />
      )}
      {modal?.kind === "team" && (
        <TeamDetailModal entry={modal.entry} data={teamData} isDark={isDark} actionLoading={busy} onChallenge={askChallenge} onClose={close} />
      )}
      {modal?.kind === "player" && (
        <PlayerDetailModal entry={modal.entry} isDark={isDark} actionLoading={busy} onClose={close}
          onContact={(e: MatchEntry) => openChat({
            type: "captain_to_player", captainId: uid, captainName: me.name, playerId: e.userId, playerName: e.displayName || "",
            sport: filters.sport || e.sports?.[0] || "Fútbol", senderId: uid, receiverId: e.userId || "",
          })} />
      )}
      {modal?.kind === "pickTeam" && (
        <TeamPickerSheet isDark={isDark} rivalName={modal.entry.teamName || "equipo"} teams={captainTeams} onClose={close}
          onPick={(t) => setModal({ kind: "challenge", entry: modal.entry, team: t as Team })} />
      )}
      {modal?.kind === "challenge" && (
        <ConfirmSheet isDark={isDark} tone="ok" icon={<Swords size={28} className="text-emerald-500" />} title={`¿Retar a ${modal.entry.teamName}?`}
          message={<>Con tu equipo <strong>{modal.team.name}</strong> · {modal.entry.sport}</>}
          confirmLabel="Confirmar reto" busy={busy} onConfirm={() => challenge(modal.entry, modal.team)} onClose={close} />
      )}
      {modal?.kind === "challengeDetail" && (
        <ChallengeDetailSheet isDark={isDark} c={modal.c} uid={uid} data={teamData} busy={busy}
          onAnswer={(accept) => setModal({ kind: "answer", c: modal.c, accept })} onClose={close} />
      )}
      {modal?.kind === "answer" && (
        <ConfirmSheet isDark={isDark} tone={modal.accept ? "ok" : "danger"}
          icon={modal.accept ? <CheckCircle2 size={28} className="text-emerald-500" /> : <X size={28} className="text-red-500" />}
          title={modal.accept ? "¿Aceptar el reto?" : "¿Rechazar el reto?"}
          message={modal.accept ? "Se abrirá un chat con el capitán rival para coordinar el partido." : "El equipo rival verá que rechazaste el reto."}
          confirmLabel={modal.accept ? "Aceptar" : "Rechazar"} busy={busy} onConfirm={() => answer(modal.c, modal.accept)} onClose={close} />
      )}
      {result && <ResultSheet isDark={isDark} type={result.type} msg={result.msg} onClose={() => setResult(null)} />}
    </div>
  );
}
