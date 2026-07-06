"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Send, User, Shield, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { matchmakingService, ChatMessage, Challenge } from "@/services/player/matchmakingService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function PartidosChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("id") || "";
  const { profile, theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const uid = user?.uid || "";
  const displayName = (profile as any)?.displayName || "Jugador";
  const photoURL = (profile as any)?.photoURL || "";

  useEffect(() => {
    if (!challengeId) return;
    const unsub = matchmakingService.subscribeToMessages(challengeId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    getDoc(doc(db, "challenges", challengeId)).then(snap => {
      if (snap.exists()) setChallenge({ id: snap.id, ...snap.data() } as Challenge);
    });
    return unsub;
  }, [challengeId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await matchmakingService.sendMessage(challengeId, {
        senderId: uid, senderName: displayName, senderPhoto: photoURL, text: input.trim(),
      });
      setInput("");
    } catch {}
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const otherName = challenge
    ? (challenge.type === "team_vs_team"
        ? (challenge.senderId === uid ? challenge.challengedTeamName : challenge.challengerTeamName)
        : (challenge.senderId === uid ? challenge.playerName : challenge.captainName))
    : "";
  const otherRole = challenge?.type === "team_vs_team" ? "Capitán" : "Jugador";

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 px-5 pt-12 pb-4 flex items-center gap-3 border-b ${isDark ? "bg-[#020617] border-white/[0.06]" : "bg-[#F8FAFC] border-slate-200"}`}>
        <button onClick={() => router.push("/player/equipos/partidos?tab=mis")} className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
            <Shield size={20} className="text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className={`font-semibold text-[14px] truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{otherName || "Chat"}</p>
            <p className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{otherRole} · {challenge?.sport}</p>
          </div>
        </div>
        {challenge?.status === "active" && (
          <button onClick={() => setShowCloseModal(true)}
            className={`w-9 h-9 rounded-[14px] flex items-center justify-center transition-all active:scale-90 ${isDark ? "bg-red-500/10 hover:bg-red-500/20" : "bg-red-50 hover:bg-red-100"}`}
            title="Finalizar reto">
            <X size={16} className="text-red-400" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center mb-4 ${isDark ? "bg-white/[0.04]" : "bg-slate-100"}`}>
              <Send size={24} className={isDark ? "text-slate-600" : "text-slate-300"} />
            </div>
            <p className={`text-xs font-medium text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>Inicia la conversación con {otherName || "el otro capitán"}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="flex items-end gap-2 max-w-[80%]">
                {!isMe && (
                  <div className="w-8 h-8 rounded-[14px] overflow-hidden shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }}>
                    {msg.senderPhoto ? <img src={msg.senderPhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={14} className={isDark ? "text-slate-400" : "text-slate-500"} /></div>}
                  </div>
                )}
                <div className={`rounded-[14px] px-4 py-2.5 ${isMe ? "bg-emerald-500 text-white" : isDark ? "bg-[#0F172A] border border-white/[0.06] text-slate-200" : "bg-white border border-slate-200 text-slate-800"}`}>
                  {!isMe && <p className="text-[9px] font-semibold opacity-70 mb-0.5">{msg.senderName}</p>}
                  <p className="text-[13px] leading-snug">{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-4 py-3 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..."
            className={`flex-1 h-[46px] rounded-[14px] px-4 text-sm font-medium outline-none border ${isDark ? "bg-[#0F172A] text-slate-100 border-white/[0.06] placeholder-slate-500" : "bg-white text-slate-900 border-slate-200 placeholder-slate-400"}`} />
          <button onClick={handleSend} disabled={!input.trim() || sending}
            className="w-[46px] h-[46px] rounded-[14px] bg-emerald-500 flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 shadow-lg shadow-emerald-500/25">
            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} className="text-white" />}
          </button>
        </div>
      </div>

      {/* Close Confirmation Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6" onClick={() => setShowCloseModal(false)}>
          <div className={`w-full max-w-sm rounded-[14px] p-6 border text-center ${isDark ? "bg-[#0F172A] border-white/[0.06]" : "bg-white border-slate-200"}`} onClick={(e) => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-[14px] flex items-center justify-center mx-auto mb-4 bg-red-500/10`}>
              <X size={28} className="text-red-500" />
            </div>
            <p className={`text-base font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>¿Finalizar reto?</p>
            <p className={`text-sm font-medium mb-6 ${isDark ? "text-slate-400" : "text-slate-500"}`}>El chat se cerrará y no podrán enviarse más mensajes.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCloseModal(false)} className={`flex-1 py-3.5 rounded-[14px] font-semibold text-sm ${isDark ? "bg-white/[0.06] text-slate-300" : "bg-slate-100 text-slate-700"}`}>Cancelar</button>
              <button onClick={async () => { await matchmakingService.closeChallenge(challengeId); setShowCloseModal(false); router.push("/player/equipos/partidos?tab=mis"); }}
                className="flex-1 py-3.5 rounded-[14px] bg-red-500 text-white font-semibold text-sm">Finalizar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
