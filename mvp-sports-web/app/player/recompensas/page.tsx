"use client";
import { useTheme } from "next-themes";
import RewardsPoints from "@/components/player/RewardsPoints";
import { useAuth } from "@/context/AuthContext";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Gift, TrendingUp } from "lucide-react";

export default function RewardsPage() {
  const { theme, resolvedTheme } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  const isDark = resolvedTheme === "dark";

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Gift size={32} className="text-pink-500" />
            Centro de Recompensas
          </h1>
          <p className={isDark ? "text-slate-400" : "text-slate-600"}>
            Acumula puntos y canjéalos por descuentos, reservas gratis y más
          </p>
        </div>

        <RewardsPoints isDark={isDark} />

        <div className={`mt-6 p-6 rounded-lg ${isDark ? "bg-[#0f1727] border border-[#1e293b]" : "bg-slate-50 border border-slate-200"}`}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Cómo funcionan los puntos
          </h3>
          <ul className={`space-y-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            <li>✅ Ganas 💎 puntos con cada acción (reservas, pagos, ratings)</li>
            <li>✅ Los puntos nunca expiran y se acumulan en tu cuenta</li>
            <li>✅ Canjea puntos por descuentos, reservas gratis o acceso VIP</li>
            <li>✅ Cada cupón canjeado tiene un código único para usar en tu próxima reserva</li>
            <li>✅ Los cupones suelen tener 30 días de validez desde el canje</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
