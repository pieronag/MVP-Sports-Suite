"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Send, User, Shield, MessageCircle } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import { chatService, ChatMessage } from "@/services/player/chatService";
import { teamService } from "@/services/player/teamService";

export default function ChatEquiposPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const teamName = searchParams.get("teamName");
  const { profile, theme } = usePlayer();
  const { user } = useAuth();
  const isDark = theme === "dark";
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);

  useEffect(() => {
    if (!teamId || !user) return;
    teamService.getTeamById(teamId).then(setTeam);
    const unsubscribe = chatService.subscribeToMessages(teamId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    });
    return () => unsubscribe();
  }, [teamId, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !teamId || sending) return;
    const text = newMessage.trim();
    setNewMessage(""); setSending(true);
    try { await chatService.sendMessage(teamId, { text, senderId: user.uid, senderName: profile?.displayName || "Jugador" }); }
    catch { setNewMessage(text); }
    finally { setSending(false); }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    try { const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp); return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { dateLabel: string; messages: ChatMessage[] }[] = [];
    let cur = "";
    msgs.forEach((msg) => {
      if (!msg.createdAt) return;
      let date;
      try { date = (msg.createdAt as any).toDate ? (msg.createdAt as any).toDate() : new Date((msg.createdAt as any).seconds * 1000); } catch { return; }
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      let label = date.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
      if (date.toDateString() === today.toDateString()) label = "Hoy";
      else if (date.toDateString() === yesterday.toDateString()) label = "Ayer";
      if (label !== cur) { groups.push({ dateLabel: label, messages: [msg] }); cur = label; }
      else { groups[groups.length - 1].messages.push(msg); }
    });
    return groups;
  };

  const grouped = groupMessagesByDate(messages);

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-[#020617]" : "bg-[#F8FAFC]"}`}>
      {/* Header */}
      <div className={`px-5 pt-12 pb-4 flex items-center gap-3 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
        <button onClick={() => router.back()} className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-all active:scale-90 ${isDark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-slate-100 hover:bg-slate-200"}`}>
          <ChevronLeft size={20} className="text-emerald-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className={`font-semibold text-base truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>{teamName || team?.name || "Chat"}</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className={`text-[9px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>{team?.members?.length || 0} jugadores</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 bg-emerald-500/10`}>
          <Shield size={18} className="text-emerald-500" />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-[14px] bg-emerald-500/10 flex items-center justify-center mb-4">
              <MessageCircle size={30} className="text-emerald-500" />
            </div>
            <p className={`text-xs font-medium text-center ${isDark ? "text-slate-500" : "text-slate-400"}`}>Sala de estrategia lista.<br />Inicia el chat con tu equipo.</p>
          </div>
        ) : (
          grouped.map((g, gi) => (
            <div key={`g-${gi}`}>
              <div className="flex justify-center my-4">
                <span className={`px-3 py-1 rounded-[14px] text-[9px] font-semibold uppercase ${isDark ? "bg-white/[0.06] text-slate-500" : "bg-slate-100 text-slate-500"}`}>{g.dateLabel}</span>
              </div>
              {g.messages.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id} className={`flex mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && (
                      <div className={`w-8 h-8 rounded-[14px] overflow-hidden shrink-0 mr-2 self-end flex items-center justify-center ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`}>
                        <User size={14} className={isDark ? "text-slate-400" : "text-slate-500"} />
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      {!isMe && <span className={`text-[9px] font-medium mb-0.5 ml-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{msg.senderName}</span>}
                      <div className={`px-3.5 py-2.5 rounded-[14px] flex items-end flex-wrap gap-1 text-sm font-medium leading-5 ${isMe ? "bg-emerald-500 text-white rounded-[14px]" : isDark ? "bg-[#1E293B] text-slate-100 rounded-[14px]" : "bg-white text-slate-900 rounded-[14px] border border-slate-200"}`}>
                        <span>{msg.text}</span>
                        <span className={`text-[8px] font-semibold shrink-0 ${isMe ? "text-white/70" : isDark ? "text-slate-500" : "text-slate-400"}`}>{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className={`px-4 py-4 pb-8 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
        <div className="flex items-center gap-2.5">
          <div className={`flex-1 flex items-center h-12 rounded-[14px] px-4 border ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="Escribe un mensaje..."
              className={`flex-1 bg-transparent text-sm font-medium outline-none ${isDark ? "text-slate-100 placeholder-slate-600" : "text-slate-900 placeholder-slate-400"}`}
            />
          </div>
          <button onClick={handleSend} disabled={!newMessage.trim() || sending}
            className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 transition-all active:scale-90 ${newMessage.trim() ? "bg-emerald-500 shadow-lg shadow-emerald-500/25" : isDark ? "bg-white/[0.04]" : "bg-slate-100"}`}>
            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} color={newMessage.trim() ? "white" : isDark ? "#94A3B8" : "#64748B"} />}
          </button>
        </div>
      </div>
    </div>
  );
}
