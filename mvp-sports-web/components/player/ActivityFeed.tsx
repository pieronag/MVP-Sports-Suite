"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/services/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { Activity, Calendar, DollarSign, Users, Trophy, Heart, MessageSquare, Clock } from "lucide-react";

interface ActivityEvent {
  id: string;
  type: "booking" | "payment" | "matchmaking" | "achievement" | "comment" | "follow";
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Timestamp;
  data: {
    bookingId?: string;
    courtName?: string;
    sport?: string;
    amount?: number;
    paymentMethod?: string;
    matchId?: string;
    opponentName?: string;
    achievement?: string;
    commentText?: string;
  };
}

const getActivityIcon = (type: string) => {
  const iconClass = "w-5 h-5";
  const colorClass = "text-slate-500 dark:text-slate-400";

  switch (type) {
    case "booking":
      return <Calendar className={`${iconClass} ${colorClass}`} />;
    case "payment":
      return <DollarSign className={`${iconClass} text-emerald-500`} />;
    case "matchmaking":
      return <Users className={`${iconClass} text-blue-500`} />;
    case "achievement":
      return <Trophy className={`${iconClass} text-amber-500`} />;
    case "comment":
      return <MessageSquare className={`${iconClass} text-purple-500`} />;
    case "follow":
      return <Heart className={`${iconClass} text-rose-500`} />;
    default:
      return <Activity className={`${iconClass} ${colorClass}`} />;
  }
};

const getActivityMessage = (event: ActivityEvent) => {
  switch (event.type) {
    case "booking":
      return `Reservó ${event.data.courtName} para ${event.data.sport}`;
    case "payment":
      return `Pagó $${(event.data.amount || 0).toLocaleString("es-CL")} con ${event.data.paymentMethod || "tarjeta"}`;
    case "matchmaking":
      return `Participó en un partido con ${event.data.opponentName}`;
    case "achievement":
      return `Logró: ${event.data.achievement}`;
    case "comment":
      return `Comentó: "${event.data.commentText}"`;
    case "follow":
      return `Comenzó a seguir a ${event.data.opponentName}`;
    default:
      return "Actividad nueva";
  }
};

const formatTime = (timestamp: Timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;

  return date.toLocaleDateString("es-CL");
};

export default function ActivityFeed({ isDark }: { isDark: boolean }) {
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const constraints: any[] = [
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(50),
    ];

    if (filter !== "all") {
      constraints.push(where("type", "==", filter));
    }

    const q = query(collection(db, "activities"), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const events: ActivityEvent[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ActivityEvent));
      setActivities(events);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, filter]);

  const bgClass = isDark ? "bg-[#020611]" : "bg-white";
  const cardClass = isDark ? "bg-[#0f1727]" : "bg-slate-50";
  const borderClass = isDark ? "border-[#1e293b]" : "border-slate-200";
  const textMutedClass = isDark ? "text-slate-400" : "text-slate-600";

  const filters = [
    { id: "all", label: "Todo" },
    { id: "booking", label: "Reservas" },
    { id: "payment", label: "Pagos" },
    { id: "matchmaking", label: "Partidos" },
    { id: "achievement", label: "Logros" },
  ];

  return (
    <div className={`${bgClass} p-5 rounded-lg`}>
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <Activity size={24} className="text-blue-500" />
        Mi Actividad
      </h2>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? "bg-blue-500 text-white"
                : `${cardClass} ${textMutedClass} border ${borderClass} hover:border-blue-500`
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de actividades */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity size={32} className="mx-auto mb-2 opacity-30" />
            <p className={textMutedClass}>No hay actividad en este filtro</p>
          </div>
        ) : (
          activities.map((event) => (
            <div
              key={event.id}
              className={`${cardClass} p-4 rounded-lg border ${borderClass} flex gap-4`}
            >
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5">
                {getActivityIcon(event.type)}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{event.userName}</p>
                    <p className={`text-sm ${textMutedClass}`}>
                      {getActivityMessage(event)}
                    </p>
                    {event.type === "booking" && event.data.bookingId && (
                      <button className="text-xs text-blue-500 hover:underline mt-1">
                        Ver reserva →
                      </button>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs ${textMutedClass} flex items-center gap-1`}>
                      <Clock size={12} />
                      {formatTime(event.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Detalles adicionales según tipo */}
                {event.type === "payment" && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      💰 {event.data.paymentMethod || "Método desconocido"}
                    </div>
                  </div>
                )}

                {event.type === "matchmaking" && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      👥 Jugaron juntos en {event.data.sport}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info de importación histórica */}
      {activities.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className={`text-xs ${textMutedClass} text-center`}>
            Mostrando tus últimas {activities.length} actividades
          </p>
        </div>
      )}
    </div>
  );
}
