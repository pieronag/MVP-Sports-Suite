"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/services/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { TrendingUp, Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  xp: number;
  ratingCount: number;
  bookingCount: number;
  tier: string;
  city?: string;
}

const getTierColor = (tier: string) => {
  const tierName = (tier || "").toLowerCase();
  if (tierName.includes("platinum") || tierName.includes("diamante")) return "text-purple-400";
  if (tierName.includes("gold") || tierName.includes("oro")) return "text-yellow-400";
  if (tierName.includes("silver") || tierName.includes("plata")) return "text-gray-300";
  return "text-amber-700";
};

const getMedalIcon = (position: number) => {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return `${position}º`;
};

export default function GlobalLeaderboard({ isDark }: { isDark: boolean }) {
  const [user, setUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterBy, setFilterBy] = useState<"xp" | "rating" | "bookings">("xp");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let orderField = "xp";
    if (filterBy === "rating") orderField = "ratingCount";
    if (filterBy === "bookings") orderField = "bookingCount";

    const q = query(collection(db, "users"), orderBy(orderField, "desc"), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => ({
        uid: doc.id,
        ...doc.data(),
      } as LeaderboardEntry));

      setLeaderboard(entries);

      // Encontrar la posición del usuario actual
      if (user?.uid) {
        const rank = entries.findIndex((e) => e.uid === user.uid);
        setUserRank(rank >= 0 ? rank + 1 : null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, filterBy]);

  const bgClass = isDark ? "bg-[#020611]" : "bg-white";
  const cardClass = isDark ? "bg-[#0f1727]" : "bg-slate-50";
  const borderClass = isDark ? "border-[#1e293b]" : "border-slate-200";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-600";

  const filters = [
    { id: "xp", label: "Por XP", icon: "⚡" },
    { id: "rating", label: "Por Rating", icon: "⭐" },
    { id: "bookings", label: "Por Partidos", icon: "🎯" },
  ];

  return (
    <div className={`${bgClass} p-5 rounded-lg`}>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy size={24} className="text-amber-500" />
        Ranking Global
      </h2>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterBy(f.id as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterBy === f.id
                ? "bg-amber-500 text-white"
                : `${cardClass} ${textMutedClass} border ${borderClass} hover:border-amber-500`
            }`}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Posición del usuario */}
      {userRank && (
        <div className="mb-5 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-sm text-amber-500 font-semibold">
            Tu posición: #{userRank} ({leaderboard.length > 0 && `Top ${Math.round((userRank / leaderboard.length) * 100)}%`})
          </p>
        </div>
      )}

      {/* Tabla de ranking */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className={`text-center py-8 ${textMutedClass}`}>No hay datos de ranking disponibles</p>
        ) : (
          leaderboard.map((entry, index) => {
            const isCurrentUser = user?.uid === entry.uid;
            const value =
              filterBy === "xp"
                ? entry.xp
                : filterBy === "rating"
                  ? entry.ratingCount
                  : entry.bookingCount;

            return (
              <div
                key={entry.uid}
                className={`${cardClass} p-3 rounded-lg border ${
                  isCurrentUser ? "border-amber-500 bg-amber-500/5" : borderClass
                } flex items-center justify-between`}
              >
                <div className="flex items-center gap-3 flex-grow min-w-0">
                  <div className="text-2xl font-bold w-8 text-center">{getMedalIcon(index + 1)}</div>

                  <div className="flex-grow min-w-0">
                    <p className="font-semibold text-sm truncate">{entry.displayName || "Jugador"}</p>
                    <p className={`text-xs ${textMutedClass}`}>
                      {entry.city && `${entry.city} • `}
                      {entry.bookingCount || 0} partidos
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="font-bold text-amber-500">
                    {filterBy === "xp"
                      ? `${value} XP`
                      : filterBy === "rating"
                        ? `${(value || 0).toFixed(1)}⭐`
                        : `${value} 🎯`}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className={`text-xs ${textMutedClass} text-center`}>
          Top 100 jugadores de MVP Sports
        </p>
      </div>
    </div>
  );
}
