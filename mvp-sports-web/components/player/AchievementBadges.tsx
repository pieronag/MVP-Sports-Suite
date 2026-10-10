"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/services/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { Trophy, Award, Target, Flame, Star, Zap, Heart, Users, TrendingUp, Clock } from "lucide-react";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  rarity: "common" | "rare" | "epic" | "legendary";
  condition: string;
  progress?: number;
  maxProgress?: number;
  unlockedAt?: Date;
  isUnlocked: boolean;
}

const ACHIEVEMENTS: Record<string, Achievement> = {
  first_booking: {
    id: "first_booking",
    name: "¡Primer Partido!",
    description: "Reserva tu primer partido",
    icon: "🎯",
    rarity: "common",
    condition: "bookingCount >= 1",
    maxProgress: 1,
  },
  booking_streak_5: {
    id: "booking_streak_5",
    name: "Jugador Frecuente",
    description: "Haz 5 reservas en un mes",
    icon: "🔥",
    rarity: "rare",
    condition: "bookingCount >= 5",
    maxProgress: 5,
  },
  booking_streak_20: {
    id: "booking_streak_20",
    name: "Obsesionado con el Deporte",
    description: "Haz 20 reservas totales",
    icon: "⚡",
    rarity: "epic",
    condition: "bookingCount >= 20",
    maxProgress: 20,
  },
  multi_sport: {
    id: "multi_sport",
    name: "Deportista Versátil",
    description: "Juega 3 deportes diferentes",
    icon: "🎪",
    rarity: "rare",
    condition: "sportsCount >= 3",
    maxProgress: 3,
  },
  payment_master: {
    id: "payment_master",
    name: "Pagador Confiable",
    description: "Completa 10 pagos online",
    icon: "💳",
    rarity: "rare",
    condition: "paymentsCount >= 10",
    maxProgress: 10,
  },
  early_bird: {
    id: "early_bird",
    name: "Madrugador",
    description: "Juega 5 partidos antes de las 09:00",
    icon: "🌅",
    rarity: "uncommon",
    condition: "earlyBookings >= 5",
    maxProgress: 5,
  },
  night_owl: {
    id: "night_owl",
    name: "Búho Nocturno",
    description: "Juega 5 partidos después de las 18:00",
    icon: "🦉",
    rarity: "uncommon",
    condition: "lateBookings >= 5",
    maxProgress: 5,
  },
  weekend_warrior: {
    id: "weekend_warrior",
    name: "Guerrero de Fin de Semana",
    description: "Juega 10 partidos en fin de semana",
    icon: "⚔️",
    rarity: "rare",
    condition: "weekendBookings >= 10",
    maxProgress: 10,
  },
  perfect_attendance: {
    id: "perfect_attendance",
    name: "Asistencia Perfecta",
    description: "Completa 10 partidos sin cancelar",
    icon: "✅",
    rarity: "epic",
    condition: "completedBookings >= 10",
    maxProgress: 10,
  },
  five_star_player: {
    id: "five_star_player",
    name: "Jugador 5 Estrellas",
    description: "Obtén un rating de 4.8 o superior",
    icon: "⭐",
    rarity: "legendary",
    condition: "playerRating >= 4.8",
  },
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "common":
      return "text-slate-400";
    case "rare":
      return "text-blue-400";
    case "epic":
      return "text-purple-400";
    case "legendary":
      return "text-yellow-400";
    default:
      return "text-slate-400";
  }
};

const getRarityBg = (rarity: string) => {
  switch (rarity) {
    case "common":
      return "bg-slate-500/10";
    case "rare":
      return "bg-blue-500/10";
    case "epic":
      return "bg-purple-500/10";
    case "legendary":
      return "bg-yellow-500/10";
    default:
      return "bg-slate-500/10";
  }
};

export default function AchievementBadges({ isDark }: { isDark: boolean }) {
  const [user, setUser] = useState<any>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Cargar estadísticas del usuario
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(query(collection(db, "users"), where("uid", "==", user.uid)), (snapshot) => {
      if (!snapshot.empty) {
        setUserStats(snapshot.docs[0].data());
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Calcular logros desbloqueados
  useEffect(() => {
    if (!userStats) {
      setLoading(false);
      return;
    }

    const achievementsList: Achievement[] = [];
    let unlockedCounter = 0;

    Object.values(ACHIEVEMENTS).forEach((achievement) => {
      let isUnlocked = false;
      let progress = 0;

      // Evaluar condición del logro
      if (achievement.id === "first_booking") {
        isUnlocked = (userStats.bookingCount || 0) >= 1;
        progress = Math.min(userStats.bookingCount || 0, 1);
      } else if (achievement.id === "booking_streak_5") {
        const monthBookings = userStats.monthlyBookings || 0;
        isUnlocked = monthBookings >= 5;
        progress = Math.min(monthBookings, 5);
      } else if (achievement.id === "booking_streak_20") {
        isUnlocked = (userStats.bookingCount || 0) >= 20;
        progress = Math.min(userStats.bookingCount || 0, 20);
      } else if (achievement.id === "multi_sport") {
        const sportsCount = userStats.sportsPlayed?.length || 0;
        isUnlocked = sportsCount >= 3;
        progress = Math.min(sportsCount, 3);
      } else if (achievement.id === "payment_master") {
        isUnlocked = (userStats.paymentsCount || 0) >= 10;
        progress = Math.min(userStats.paymentsCount || 0, 10);
      } else if (achievement.id === "perfect_attendance") {
        isUnlocked = (userStats.completedBookings || 0) >= 10;
        progress = Math.min(userStats.completedBookings || 0, 10);
      } else if (achievement.id === "five_star_player") {
        isUnlocked = (userStats.ratingCount || 0) >= 4.8;
      }

      if (isUnlocked) unlockedCounter++;

      achievementsList.push({
        ...achievement,
        isUnlocked,
        progress,
      });
    });

    setAchievements(achievementsList);
    setUnlockedCount(unlockedCounter);
    setLoading(false);
  }, [userStats]);

  const bgClass = isDark ? "bg-[#020611]" : "bg-white";
  const cardClass = isDark ? "bg-[#0f1727]" : "bg-slate-50";
  const borderClass = isDark ? "border-[#1e293b]" : "border-slate-200";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-600";

  return (
    <div className={`${bgClass} p-5 rounded-lg`}>
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
        <Trophy size={24} className="text-yellow-500" />
        Logros y Badges
      </h2>
      <p className={`text-sm ${textMutedClass} mb-5`}>
        {unlockedCount} de {Object.keys(ACHIEVEMENTS).length} desbloqueados
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`${
                achievement.isUnlocked
                  ? `${cardClass} border ${borderClass}`
                  : `${cardClass} border ${borderClass} opacity-50`
              } p-4 rounded-lg text-center transition-transform hover:scale-105`}
            >
              <div className="text-3xl mb-2">{achievement.icon}</div>
              <p className="font-semibold text-sm">{achievement.name}</p>
              <p className={`text-xs ${textMutedClass} mt-1 line-clamp-2`}>{achievement.description}</p>

              {!achievement.isUnlocked && achievement.maxProgress && (
                <div className="mt-3">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((achievement.progress || 0) / achievement.maxProgress) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-yellow-500 mt-1">
                    {Math.floor(achievement.progress || 0)}/{achievement.maxProgress}
                  </p>
                </div>
              )}

              {achievement.isUnlocked && (
                <p className="text-xs text-yellow-500 mt-2 font-semibold">✓ Desbloqueado</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className={`text-xs ${textMutedClass} text-center`}>
          Sigue jugando para desbloquear más logros y obtener recompensas especiales
        </p>
      </div>
    </div>
  );
}
