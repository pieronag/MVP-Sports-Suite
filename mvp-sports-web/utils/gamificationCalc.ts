// Cálculo puro de experiencia, nivel y logros a partir de las reservas (sin acceso a la base).

export const DEFAULT_TIERS = { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 };
const TIER_NAMES: [keyof typeof DEFAULT_TIERS, string][] = [
  ["legend", "LEYENDA"], ["elite", "ÉLITE"], ["diamond", "DIAMANTE"], ["platinum", "PLATINO"], ["gold", "ORO"], ["silver", "PLATA"],
];
const BADGE_ALIAS: Record<string, string> = { goals: "scorer", assists: "playmaker", clean_sheets: "defender", won: "wins", played: "experience", sports_played: "multi_sport", loyalty: "loyal" };

export type GamificationConfig = ReturnType<typeof normalizeSettings>;

// settings/global de Firestore → configuración con valores por defecto
export function normalizeSettings(s: any = {}) {
  const g = s.gamification || {};
  return {
    xp: {
      match: g.xpPerMatch ?? 100, checkin: g.xpPerCheckin ?? 50, win: g.xpPerWin ?? 150, loss: g.xpPerLoss ?? 50,
      goal: g.xpPerGoal ?? 25, assist: g.xpPerAssist ?? 15, mvp: g.xpPerMvp ?? 200, noShow: g.xpPerNoShow ?? 150,
    },
    sportsOverrides: s.sportsOverrides || g.sportsOverrides || {},
    tiers: { ...DEFAULT_TIERS, ...(s.tiers || g.tiers || {}) },
    badges: s.badges || g.badges || {},
    badgeXp: s.badgeXpValues || g.badgeXpValues || { bronze: 50, silver: 150, gold: 500 },
  };
}

const norm = (x: string) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const toDate = (d: any): Date | null => (d?.toDate ? d.toDate() : d ? new Date(d) : null);

export function computeProgress(uid: string, user: any, bookings: any[], cfg: GamificationConfig, now = Date.now()) {
  const st = { played: 0, won: 0, lost: 0, goals: 0, assists: 0, mvps: 0, checkins: 0, noShows: 0, morning: 0, night: 0, weekend: 0 };
  const sports = new Set<string>();
  for (const b of bookings) {
    const mine = b.userId === uid;
    const noShow = b.status === "no-show" || b.paymentStatus === "no-show" || b.noShow === true;
    if (noShow) { if (mine) st.noShows++; continue; }
    if (b.status === "cancelled" || b.status === "rejected") continue;
    const start = toDate(b.date);
    // Solo cuenta lo que realmente se jugó: con ingreso registrado o partido interno (sin check-in no hay partido)
    const happened = b.isInternalMatch || b.checkIn || b.checkOut || b.status === "completed";
    if (!happened) continue;

    st.played++;
    if (mine && b.checkIn) st.checkins++;
    if (b.sport) sports.add(norm(b.sport));
    const hour = Number(String(b.startTime || "").split(":")[0]);
    if (!isNaN(hour)) { if (hour >= 6 && hour < 12) st.morning++; if (hour >= 19) st.night++; }
    if (start && [0, 6].includes(start.getDay())) st.weekend++;

    const team = b.teamAssignments?.[uid];
    if (team === "A" || team === "B") {
      if (b.winnerTeam === team) st.won++; else if (b.winnerTeam && b.winnerTeam !== "draw") st.lost++;
    } else if (mine && b.matchOutcome) {
      if (b.matchOutcome === "win") st.won++; else if (b.matchOutcome === "loss") st.lost++;
    }
    st.goals += Number(b.teamStats?.[uid] ?? (mine ? b.goals : 0)) || 0;
    st.assists += Number(b.teamAssists?.[uid] ?? (mine ? b.assists : 0)) || 0;
    if (b.mvpUserId === uid || (mine && b.isMVP && !b.mvpUserId)) st.mvps++;
  }

  const ov = cfg.sportsOverrides[norm(user.mainSport || "futbol")] || {};
  const x = {
    match: ov.xpPerMatch ?? cfg.xp.match, checkin: ov.xpPerCheckin ?? cfg.xp.checkin, win: ov.winXP ?? cfg.xp.win, loss: ov.lossXP ?? cfg.xp.loss,
    goal: ov.goalXP ?? cfg.xp.goal, assist: ov.assistXP ?? cfg.xp.assist, mvp: ov.xpPerMvp ?? cfg.xp.mvp, noShow: ov.xpPerNoShow ?? cfg.xp.noShow,
  };
  let xp = st.played * x.match + st.checkins * x.checkin + st.won * x.win - st.lost * x.loss
    + st.goals * x.goal + st.assists * x.assist + st.mvps * x.mvp - st.noShows * x.noShow;

  const created = toDate(user.createdAt);
  const loyal = created ? Math.max(0, Math.floor((now - created.getTime()) / (30 * 86_400_000))) : 0;
  const values: Record<string, number> = {
    scorer: st.goals, playmaker: st.assists, wins: st.won, mvp: st.mvps, experience: st.played, multi_sport: Math.max(1, sports.size),
    morning_player: st.morning, night_player: st.night, weekend_warrior: st.weekend, loyal, stamina: st.played * 60,
  };
  const badges: { id: string; tier: string; value: number }[] = [];
  let badgeXpBonus = 0;
  for (const [rawId, conf] of Object.entries<any>(cfg.badges)) {
    const id = BADGE_ALIAS[rawId] || rawId;
    const v = values[id] || 0;
    if (v <= 0 || badges.some((b) => b.id === id)) continue;
    const tier = ["gold", "silver", "bronze"].find((t) => Number(conf?.[t]) > 0 && v >= Number(conf[t]));
    if (tier) { badges.push({ id, tier, value: v }); badgeXpBonus += Number(cfg.badgeXp[tier]) || 0; }
  }
  xp = Math.max(0, Math.round(xp + badgeXpBonus));

  const tier = TIER_NAMES.find(([k]) => xp >= Number(cfg.tiers[k]))?.[1] || "BRONCE";
  const ovr = Math.floor(40 + Math.min(1, Math.sqrt(xp / (Number(cfg.tiers.legend) || 25000))) * 59);
  return {
    xp, ovr, tier, badges, badgeXpBonus,
    stats: {
      played: st.played, won: st.won, lost: st.lost, goals: st.goals, assists: st.assists, mvps: st.mvps, checkins: st.checkins,
      noShows: st.noShows, sports_played: Math.max(1, sports.size), morning_matches: st.morning, night_matches: st.night, weekend_matches: st.weekend, loyal,
    },
  };
}
