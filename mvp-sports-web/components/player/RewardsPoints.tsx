"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/services/firebase";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { Gift, TrendingUp, Zap, Target, Ticket } from "lucide-react";

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  discount?: number;
  icon: string;
  category: "discount" | "free_booking" | "premium" | "special";
  isAvailable: boolean;
}

const AVAILABLE_REWARDS: Reward[] = [
  {
    id: "discount_10",
    name: "10% Descuento",
    description: "10% de descuento en tu próxima reserva",
    pointsCost: 500,
    discount: 10,
    icon: "💰",
    category: "discount",
    isAvailable: true,
  },
  {
    id: "discount_25",
    name: "25% Descuento",
    description: "25% de descuento en tu próxima reserva",
    pointsCost: 1000,
    discount: 25,
    icon: "🎉",
    category: "discount",
    isAvailable: true,
  },
  {
    id: "free_booking",
    name: "Reserva Gratis",
    description: "Una reserva completamente gratis (hasta $30,000)",
    pointsCost: 2000,
    icon: "🎁",
    category: "free_booking",
    isAvailable: true,
  },
  {
    id: "premium_month",
    name: "Premium 1 Mes",
    description: "Acceso a beneficios premium por 30 días",
    pointsCost: 3000,
    icon: "👑",
    category: "premium",
    isAvailable: true,
  },
  {
    id: "event_vip",
    name: "Entrada VIP",
    description: "Acceso VIP a nuestro próximo torneo",
    pointsCost: 2500,
    icon: "🎪",
    category: "special",
    isAvailable: true,
  },
];

const POINT_ACTIVITIES = [
  { activity: "Completar una reserva", points: 50 },
  { activity: "Pagar online", points: 30 },
  { activity: "Rating de 5 estrellas", points: 75 },
  { activity: "Invitar a un amigo", points: 200 },
  { activity: "Logro desbloqueado", points: 100 },
];

export default function RewardsPoints({ isDark }: { isDark: boolean }) {
  const [user, setUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [redeemedRewards, setRedeemedRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Cargar puntos del usuario
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(query(collection(db, "users"), where("uid", "==", user.uid)), (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        setUserPoints(userData.rewardPoints || 0);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Cargar recompensas canjeadas
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      query(collection(db, "reward_redemptions"), where("userId", "==", user.uid)),
      (snapshot) => {
        const rewards = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRedeemedRewards(rewards);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const bgClass = isDark ? "bg-[#020611]" : "bg-white";
  const cardClass = isDark ? "bg-[#0f1727]" : "bg-slate-50";
  const borderClass = isDark ? "border-[#1e293b]" : "border-slate-200";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-600";

  const canRedeem = (pointsCost: number) => userPoints >= pointsCost;

  return (
    <div className={`${bgClass} p-5 rounded-lg`}>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Gift size={24} className="text-pink-500" />
        Mis Puntos de Recompensa
      </h2>

      {/* Balance de Puntos */}
      <div className={`${cardClass} p-6 rounded-lg border ${borderClass} mb-6`}>
        <div className="flex items-center justify-between mb-2">
          <span className={textMutedClass}>Puntos Disponibles</span>
          <span className="text-pink-500">💎</span>
        </div>
        <div className="text-4xl font-bold text-pink-500">{userPoints.toLocaleString("es-CL")}</div>
        <p className={`text-sm ${textMutedClass} mt-2`}>
          {userPoints < 500
            ? `Falta ${(500 - userPoints).toLocaleString("es-CL")} puntos para el primer descuento`
            : "¡Puedes canjear una recompensa!"}
        </p>
      </div>

      {/* Cómo ganar puntos */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Zap size={18} className="text-yellow-500" />
          Cómo ganar puntos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {POINT_ACTIVITIES.map((item, idx) => (
            <div key={idx} className={`${cardClass} p-3 rounded-lg border ${borderClass} flex justify-between items-center`}>
              <span className="text-sm">{item.activity}</span>
              <span className="font-bold text-yellow-500">+{item.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recompensas disponibles */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Target size={18} className="text-emerald-500" />
          Recompensas Disponibles
        </h3>
        <div className="space-y-3">
          {AVAILABLE_REWARDS.map((reward) => (
            <div
              key={reward.id}
              className={`${cardClass} p-4 rounded-lg border ${borderClass} flex items-center justify-between ${
                !canRedeem(reward.pointsCost) ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3 flex-grow">
                <span className="text-3xl">{reward.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{reward.name}</p>
                  <p className={`text-xs ${textMutedClass}`}>{reward.description}</p>
                </div>
              </div>
              <button
                disabled={!canRedeem(reward.pointsCost)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ml-4 transition-colors ${
                  canRedeem(reward.pointsCost)
                    ? "bg-pink-500 text-white hover:bg-pink-600"
                    : "bg-slate-500/30 text-slate-400 cursor-not-allowed"
                }`}
              >
                {reward.pointsCost} 💎
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recompensas canjeadas */}
      {redeemedRewards.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Ticket size={18} className="text-blue-500" />
            Mis Cupones ({redeemedRewards.length})
          </h3>
          <div className="space-y-2">
            {redeemedRewards.map((reward) => (
              <div key={reward.id} className={`${cardClass} p-3 rounded-lg border ${borderClass} flex justify-between items-center`}>
                <div>
                  <p className="font-semibold text-sm">{reward.rewardName}</p>
                  <p className={`text-xs ${textMutedClass}`}>
                    {reward.expiresAt
                      ? `Expira: ${new Date(reward.expiresAt.seconds * 1000).toLocaleDateString("es-CL")}`
                      : "Sin fecha de vencimiento"}
                  </p>
                </div>
                <code className="bg-slate-700 px-3 py-1 rounded text-xs font-mono">{reward.code}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
