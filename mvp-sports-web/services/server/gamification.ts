import "server-only";
import { adminDb } from "./firebase-admin";

// Experiencia, nivel y logros calculados solo en el servidor a partir de las reservas. El jugador no puede
// escribir estos campos (reglas de Firestore); se recalculan tras un check-in, un partido interno y cada noche.

const DEFAULT_TIERS = { bronze: 0, silver: 1000, gold: 3000, platinum: 6000, diamond: 10000, elite: 15000, legend: 25000 };
const TIER_NAMES: [keyof typeof DEFAULT_TIERS, string][] = [
  ["legend", "LEYENDA"], ["elite", "ÉLITE"], ["diamond", "DIAMANTE"], ["platinum", "PLATINO"], ["gold", "ORO"], ["silver", "PLATA"],
];
const BADGE_ALIAS: Record<string, string> = { goals: "scorer", assists: "playmaker", clean_sheets: "defender", won: "wins", played: "experience", sports_played: "multi_sport", loyalty: "loyal" };

let settingsCache: { at: number; value: any } | null = null;
async function loadSettings() {
  if (settingsCache && Date.now() - settingsCache.at < 10 * 60_000) return settingsCache.value;
  const s = (await adminDb().collection("settings").doc("global").get()).data() || {};
  const g = s.gamification || {};
  const value = {
    xp: {
      match: g.xpPerMatch ?? 100, checkin: g.xpPerCheckin ?? 50, win: g.xpPerWin ?? 150, loss: g.xpPerLoss ?? 50,
      goal: g.xpPerGoal ?? 25, assist: g.xpPerAssist ?? 15, mvp: g.xpPerMvp ?? 200, noShow: g.xpPerNoShow ?? 150,
    },
    sportsOverrides: s.sportsOverrides || g.sportsOverrides || {},
    tiers: { ...DEFAULT_TIERS, ...(s.tiers || g.tiers || {}) },
    badges: s.badges || g.badges || {},
    badgeXp: s.badgeXpValues || g.badgeXpValues || { bronze: 50, silver: 150, gold: 500 },
  };
  settingsCache = { at: Date.now(), value };
  return value;
}

const norm = (x: string) => String(x || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const toDate = (d: any): Date | null => (d?.toDate ? d.toDate() : d ? new Date(d) : null);

export async function recomputePlayer(uid: string): Promise<{ xp: number } | null> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const [userSnap, own, joined, cfg] = await Promise.all([
    userRef.get(),
    db.collection("bookings").where("userId", "==", uid).get(),
    db.collection("bookings").where("participantIds", "array-contains", uid).get(),
    loadSettings(),
  ]);
  if (!userSnap.exists) return null;
  const user = userSnap.data() || {};
  if (user.role && !["player", "user"].includes(String(user.role).toLowerCase())) return null;

  const bookings = new Map<string, any>();
  [...own.docs, ...joined.docs].forEach((d) => bookings.set(d.id, d.data()));

  const st = { played: 0, won: 0, lost: 0, goals: 0, assists: 0, mvps: 0, checkins: 0, noShows: 0, morning: 0, night: 0, weekend: 0 };
  const sports = new Set<string>();
  const now = Date.now();
  for (const b of bookings.values()) {
    const mine = b.userId === uid;
    const noShow = b.status === "no-show" || b.paymentStatus === "no-show" || b.noShow === true;
    if (noShow) { if (mine) st.noShows++; continue; }
    if (b.status === "cancelled" || b.status === "rejected") continue;
    const start = toDate(b.date);
    const happened = b.isInternalMatch || b.checkIn || b.checkOut || b.status === "completed" || (start && start.getTime() + 60 * 60_000 < now && b.paymentStatus === "paid");
    if (!happened) continue;

    st.played++;
    if (mine && b.checkIn) st.checkins++;
    if (b.sport) sports.add(norm(b.sport));
    const hour = Number(String(b.startTime || "").split(":")[0]);
    if (!isNaN(hour)) { if (hour < 12 && hour >= 6) st.morning++; if (hour >= 19) st.night++; }
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

  const o = { ...cfg.xp, ...(cfg.sportsOverrides[norm(user.mainSport || "futbol")] || {}) };
  let xp = st.played * (o.xpPerMatch ?? o.match) + st.checkins * (o.xpPerCheckin ?? o.checkin) + st.won * (o.winXP ?? o.win)
    - st.lost * (o.lossXP ?? o.loss) + st.goals * (o.goalXP ?? o.goal) + st.assists * (o.assistXP ?? o.assist)
    + st.mvps * (o.xpPerMvp ?? o.mvp) - st.noShows * (o.xpPerNoShow ?? o.noShow);

  const created = toDate(user.createdAt);
  const loyal = created ? Math.floor((now - created.getTime()) / (30 * 86_400_000)) : 0;
  const values: Record<string, number> = {
    scorer: st.goals, playmaker: st.assists, wins: st.won, mvp: st.mvps, experience: st.played, multi_sport: Math.max(1, sports.size),
    morning_player: st.morning, night_player: st.night, weekend_warrior: st.weekend, loyal, stamina: st.played * 60,
  };
  const badges: { id: string; tier: string; value: number }[] = [];
  let badgeXpBonus = 0;
  for (const [rawId, conf] of Object.entries<any>(cfg.badges)) {
    const id = BADGE_ALIAS[rawId] || rawId;
    const v = values[id] || 0;
    if (v <= 0 || badges.some((x) => x.id === id)) continue;
    const tier = ["gold", "silver", "bronze"].find((t) => Number(conf?.[t]) > 0 && v >= Number(conf[t]));
    if (tier) { badges.push({ id, tier, value: v }); badgeXpBonus += Number(cfg.badgeXp[tier]) || 0; }
  }
  xp = Math.max(0, Math.round(xp + badgeXpBonus));

  const tier = TIER_NAMES.find(([k]) => xp >= Number(cfg.tiers[k]))?.[1] || "BRONCE";
  const ovr = Math.floor(40 + Math.min(1, Math.sqrt(xp / (Number(cfg.tiers.legend) || 25000))) * 59);
  await userRef.update({
    xp, ovr, tier, badges, badgeXpBonus,
    stats: { played: st.played, won: st.won, lost: st.lost, goals: st.goals, assists: st.assists, mvps: st.mvps, checkins: st.checkins, noShows: st.noShows, sports_played: Math.max(1, sports.size), morning_matches: st.morning, night_matches: st.night, weekend_matches: st.weekend, loyal },
    lastStatsUpdate: new Date().toISOString(),
  });
  return { xp };
}
