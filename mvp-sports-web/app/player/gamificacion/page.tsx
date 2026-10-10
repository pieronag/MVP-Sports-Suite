"use client";
import { useTheme } from "next-themes";
import AchievementBadges from "@/components/player/AchievementBadges";
import GlobalLeaderboard from "@/components/player/GlobalLeaderboard";
import { useAuth } from "@/context/AuthContext";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trophy, Award, TrendingUp } from "lucide-react";

export default function GamificationPage() {
  const { theme, resolvedTheme } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  const isDark = resolvedTheme === "dark";
  const [activeTab, setActiveTab] = useState<"badges" | "ranking">("badges");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingOverlay variant="page" />;
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#020611]" : "bg-white"}`}>
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Trophy size={32} className="text-amber-500" />
            Mi Trayectoria
          </h1>
          <p className={isDark ? "text-slate-400" : "text-slate-600"}>
            Logros, badges y tu posición en el ranking de MVP Sports
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6 border-b border-slate-700 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("badges")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "badges"
                ? "border-b-2 border-amber-500 text-amber-500"
                : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award size={18} className="inline mr-2" />
            Logros
          </button>
          <button
            onClick={() => setActiveTab("ranking")}
            className={`px-4 py-3 font-semibold transition-colors ${
              activeTab === "ranking"
                ? "border-b-2 border-amber-500 text-amber-500"
                : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TrendingUp size={18} className="inline mr-2" />
            Ranking
          </button>
        </div>

        {/* Contenido */}
        <div className="space-y-6">
          {activeTab === "badges" && (
            <>
              <AchievementBadges isDark={isDark} />
              <div
                className={`p-6 rounded-lg ${
                  isDark ? "bg-[#0f1727] border border-[#1e293b]" : "bg-slate-50 border border-slate-200"
                }`}
              >
                <h3 className="font-semibold mb-3">💡 Tips para desbloquear logros</h3>
                <ul className={`space-y-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  <li>✓ Reserva tu primer partido para desbloquear "¡Primer Partido!"</li>
                  <li>✓ Juega múltiples deportes para obtener "Deportista Versátil"</li>
                  <li>✓ Completa todos tus partidos para "Asistencia Perfecta"</li>
                  <li>✓ Mantén un buen rating para alcanzar "Jugador 5 Estrellas"</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === "ranking" && <GlobalLeaderboard isDark={isDark} />}
        </div>
      </div>
    </div>
  );
}
