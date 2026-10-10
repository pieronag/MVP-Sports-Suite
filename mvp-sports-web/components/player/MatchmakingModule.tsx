"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/services/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { Users, MapPin, Clock, Zap, Search, X, Bell } from "lucide-react";

interface MatchRequest {
  id: string;
  uid: string;
  type: "need" | "join"; // "need": busco jugadores, "join": me sumo
  sport: string;
  city: string;
  level?: string; // bronze, silver, gold, platinum
  date?: string;
  time?: string;
  maxPlayers?: number;
  currentPlayers?: number;
  description?: string;
  userProfile?: { name: string; level: string; rating: number; city: string };
  createdAt: Timestamp;
}

export default function MatchmakingModule({ isDark }: { isDark: boolean }) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [myRequests, setMyRequests] = useState<MatchRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"find" | "posted">("find");
  const [filters, setFilters] = useState({ sport: "", level: "", city: "", date: "" });
  const [newRequest, setNewRequest] = useState({ type: "need", sport: "", city: "", level: "", maxPlayers: 4, description: "" });
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser(u);
        const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", u.uid)));
        if (!userDoc.empty) {
          setUserProfile(userDoc.docs[0].data());
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all match requests
  useEffect(() => {
    if (!user || !userProfile) return;

    const q = query(
      collection(db, "matchmaking"),
      where("uid", "!=", user.uid),
      where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))) // Last 7 days
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: MatchRequest[] = [];
      for (const doc of snapshot.docs) {
        const req = { id: doc.id, ...doc.data() } as MatchRequest;
        const otherUser = await getDocs(query(collection(db, "users"), where("uid", "==", req.uid)));
        if (!otherUser.empty) {
          req.userProfile = {
            name: otherUser.docs[0].data().name || "Jugador",
            level: otherUser.docs[0].data().level || "bronze",
            rating: otherUser.docs[0].data().ratingCount || 4.5,
            city: otherUser.docs[0].data().city || "",
          };
        }
        data.push(req);
      }
      setRequests(data);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch user's own requests
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "matchmaking"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MatchRequest)));
    });

    return () => unsubscribe();
  }, [user]);

  const postRequest = async () => {
    if (!user || !userProfile) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "matchmaking"), {
        uid: user.uid,
        type: newRequest.type,
        sport: newRequest.sport,
        city: userProfile.city || newRequest.city,
        level: newRequest.level,
        maxPlayers: newRequest.maxPlayers,
        currentPlayers: newRequest.type === "need" ? 1 : 0,
        description: newRequest.description,
        createdAt: Timestamp.now(),
      });
      setNewRequest({ type: "need", sport: "", city: "", level: "", maxPlayers: 4, description: "" });
      setNotifications(["✅ Búsqueda publicada!"]);
      setTimeout(() => setNotifications([]), 3000);
    } catch (error) {
      console.error("Error posting request:", error);
    }
    setLoading(false);
  };

  const deleteRequest = async (id: string) => {
    await deleteDoc(doc(db, "matchmaking", id));
  };

  const joinRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, "matchmaking", requestId), {
        currentPlayers: (requests.find((r) => r.id === requestId)?.currentPlayers || 0) + 1,
      });
      setNotifications(["✅ ¡Te sumaste al grupo!"]);
      setTimeout(() => setNotifications([]), 3000);
    } catch (error) {
      console.error("Error joining request:", error);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filters.sport && r.sport !== filters.sport) return false;
    if (filters.level && r.level !== filters.level) return false;
    if (filters.city && r.city !== filters.city) return false;
    return true;
  });

  const bgClass = isDark ? "bg-[#020611]" : "bg-white";
  const cardClass = isDark ? "bg-[#0f1727]" : "bg-slate-50";
  const borderClass = isDark ? "border-[#1e293b]" : "border-slate-200";

  return (
    <div className={`${bgClass} p-5 rounded-lg`}>
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <Users size={24} className="text-emerald-500" />
        Encuentra Jugadores
      </h2>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500 text-emerald-500 rounded-md text-sm">
          {notifications[0]}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3 mb-5 border-b border-slate-300">
        <button
          onClick={() => setActiveTab("find")}
          className={`pb-2 px-3 font-semibold ${activeTab === "find" ? "border-b-2 border-emerald-500 text-emerald-500" : "text-slate-600"}`}
        >
          <Search size={18} className="inline mr-2" />
          Buscar
        </button>
        <button
          onClick={() => setActiveTab("posted")}
          className={`pb-2 px-3 font-semibold ${activeTab === "posted" ? "border-b-2 border-emerald-500 text-emerald-500" : "text-slate-600"}`}
        >
          <Bell size={18} className="inline mr-2" />
          Mis Búsquedas ({myRequests.length})
        </button>
      </div>

      {activeTab === "find" && (
        <div>
          {/* Filters */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <select
              value={filters.sport}
              onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
              className={`p-2 rounded-md text-sm border ${borderClass} ${cardClass}`}
            >
              <option value="">Todos los deportes</option>
              <option value="Futbol">⚽ Fútbol</option>
              <option value="Futbolito">🏐 Futbolito</option>
              <option value="Padel">🎾 Pádel</option>
              <option value="Tenis">🎾 Tenis</option>
              <option value="Basquetbol">🏀 Básquetbol</option>
            </select>

            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className={`p-2 rounded-md text-sm border ${borderClass} ${cardClass}`}
            >
              <option value="">Todos los niveles</option>
              <option value="bronze">🥉 Principiante</option>
              <option value="silver">🥈 Intermedio</option>
              <option value="gold">🥇 Avanzado</option>
              <option value="platinum">💎 Experto</option>
            </select>
          </div>

          {/* Available requests */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredRequests.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay búsquedas disponibles ahora</p>
            ) : (
              filteredRequests.map((req) => (
                <div key={req.id} className={`${cardClass} p-4 rounded-lg border ${borderClass}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{req.userProfile?.name}</h3>
                      <p className="text-xs text-slate-500">
                        {req.sport} • {req.level === "bronze" ? "🥉" : req.level === "silver" ? "🥈" : req.level === "gold" ? "🥇" : "💎"} {req.level}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-500">{req.currentPlayers || 1}/{req.maxPlayers}</div>
                      <p className="text-xs text-slate-500">jugadores</p>
                    </div>
                  </div>

                  {req.description && <p className="text-sm mb-3 text-slate-600">{req.description}</p>}

                  <div className="flex gap-2 text-xs text-slate-500 mb-3">
                    {req.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {req.city}
                      </span>
                    )}
                    {req.date && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {req.date}
                      </span>
                    )}
                  </div>

                  {req.type === "need" ? (
                    <button
                      onClick={() => joinRequest(req.id)}
                      className="w-full bg-emerald-500 text-white py-2 rounded-md text-sm font-semibold hover:bg-emerald-600"
                    >
                      Me sumo ✋
                    </button>
                  ) : (
                    <button className="w-full bg-emerald-500 text-white py-2 rounded-md text-sm font-semibold hover:bg-emerald-600">
                      Contactar
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "posted" && (
        <div>
          {/* Post new request form */}
          <div className={`${cardClass} p-4 rounded-lg border ${borderClass} mb-5`}>
            <h3 className="font-semibold mb-3">Publica tu búsqueda</h3>
            <div className="space-y-3">
              <select
                value={newRequest.type}
                onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value as "need" | "join" })}
                className={`w-full p-2 rounded-md text-sm border ${borderClass} ${cardClass}`}
              >
                <option value="need">🔍 Busco jugadores para mi partido</option>
                <option value="join">✋ Quiero sumarme a un partido</option>
              </select>

              <select
                value={newRequest.sport}
                onChange={(e) => setNewRequest({ ...newRequest, sport: e.target.value })}
                className={`w-full p-2 rounded-md text-sm border ${borderClass} ${cardClass}`}
                required
              >
                <option value="">Selecciona deporte</option>
                <option value="Futbol">⚽ Fútbol</option>
                <option value="Futbolito">🏐 Futbolito</option>
                <option value="Padel">🎾 Pádel</option>
              </select>

              {newRequest.type === "need" && (
                <>
                  <input
                    type="number"
                    placeholder="Máximo de jugadores"
                    value={newRequest.maxPlayers}
                    onChange={(e) => setNewRequest({ ...newRequest, maxPlayers: parseInt(e.target.value) })}
                    className={`w-full p-2 rounded-md text-sm border ${borderClass} ${cardClass}`}
                    min="2"
                    max="20"
                  />
                </>
              )}

              <select
                value={newRequest.level}
                onChange={(e) => setNewRequest({ ...newRequest, level: e.target.value })}
                className={`w-full p-2 rounded-md text-sm border ${borderClass} ${cardClass}`}
              >
                <option value="">Nivel (opcional)</option>
                <option value="bronze">🥉 Principiante</option>
                <option value="silver">🥈 Intermedio</option>
                <option value="gold">🥇 Avanzado</option>
              </select>

              <textarea
                placeholder="Descripción (ej: mañana 19:00, zona Providencia)"
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                className={`w-full p-2 rounded-md text-sm border ${borderClass} ${cardClass} resize-none h-20`}
              />

              <button
                onClick={postRequest}
                disabled={loading || !newRequest.sport}
                className="w-full bg-emerald-500 text-white py-2 rounded-md font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {loading ? "Publicando..." : "Publicar búsqueda"}
              </button>
            </div>
          </div>

          {/* My requests */}
          <div className="space-y-3">
            {myRequests.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No has publicado búsquedas aún</p>
            ) : (
              myRequests.map((req) => (
                <div key={req.id} className={`${cardClass} p-4 rounded-lg border ${borderClass} flex justify-between items-start`}>
                  <div>
                    <h3 className="font-semibold">{req.type === "need" ? "🔍 Busco jugadores" : "✋ Quiero sumarme"}</h3>
                    <p className="text-sm text-slate-600 mt-1">{req.sport}</p>
                    {req.description && <p className="text-xs text-slate-500 mt-2">{req.description}</p>}
                    {req.type === "need" && <p className="text-xs text-emerald-500 mt-2 font-semibold">{req.currentPlayers || 1}/{req.maxPlayers} jugadores</p>}
                  </div>
                  <button onClick={() => deleteRequest(req.id)} className="text-slate-400 hover:text-red-500">
                    <X size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
