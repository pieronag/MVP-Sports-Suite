"use client";
// Ajuste de notificaciones push del dispositivo actual (Ajustes del jugador)
import { useEffect, useState } from "react";
import { Bell } from "@/components/player/icons";
import { pushState, enablePush, disablePush, sendTestPush, type PushState } from "@/services/client/push";

const isIos = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone = () => typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export default function PushSettings({ isDark, onMessage }: { isDark: boolean; onMessage: (type: "success" | "error", msg: string) => void }) {
    const [state, setState] = useState<PushState | "loading">("loading");
    const [busy, setBusy] = useState(false);

    useEffect(() => { pushState().then(setState).catch(() => setState("unsupported")); }, []);

    const on = state === "on";
    const iosNeedsInstall = isIos() && !isStandalone();
    const hint =
        state === "loading" ? "Revisando…" :
        state === "on" ? "Te avisamos cuando se confirme, cambie o anule una reserva." :
        state === "blocked" ? "Están bloqueadas en este navegador. Actívalas en los permisos del sitio." :
        state === "unsupported" ? (iosNeedsInstall ? "En iPhone, primero agrega la app a tu pantalla de inicio." : "Este navegador no permite notificaciones.") :
        "Recibe avisos de tus reservas e inscripciones.";

    const toggle = async () => {
        if (busy || state === "loading" || state === "unsupported" || state === "blocked") return;
        setBusy(true);
        try {
            const next = on ? await disablePush() : await enablePush();
            setState(next);
            if (next === "on") onMessage("success", "Notificaciones activadas en este dispositivo.");
            else if (next === "blocked") onMessage("error", "Bloqueaste las notificaciones. Puedes permitirlas en los ajustes del navegador.");
            else if (on) onMessage("success", "Notificaciones desactivadas.");
        } catch (e: any) {
            onMessage("error", e?.message || "No pudimos cambiar las notificaciones. Intenta de nuevo.");
        } finally { setBusy(false); }
    };

    const test = async () => {
        setBusy(true);
        try { await sendTestPush(); onMessage("success", "Enviamos una notificación de prueba."); }
        catch (e: any) { onMessage("error", e?.message || "No se pudo enviar la prueba."); }
        finally { setBusy(false); }
    };

    const disabled = state === "loading" || state === "unsupported" || state === "blocked";
    return (
        <div className={`py-3.5 ${isDark ? "border-b border-white/6" : "border-b border-slate-100"}`}>
            <button type="button" role="switch" aria-checked={on} aria-label="Notificaciones" onClick={toggle} disabled={disabled || busy}
                className="w-full flex items-center gap-3.5 text-left disabled:opacity-60">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${isDark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                    <Bell size={20} className="text-emerald-500" />
                </div>
                <span className="flex-1 min-w-0">
                    <span className={`block text-[14px] font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>Notificaciones</span>
                    <span className={`block text-[12px] leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>{hint}</span>
                </span>
                <span className={`w-11 h-6 rounded-full relative shrink-0 transition-colors duration-300 ${on ? "bg-emerald-500" : isDark ? "bg-white/15" : "bg-slate-300"}`}>
                    <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${on ? "left-6" : "left-1"}`} />
                </span>
            </button>
            {on && (
                <button type="button" onClick={test} disabled={busy}
                    className={`mt-3 ml-[54px] h-10 px-4 rounded-md text-[12px] font-semibold ${isDark ? "bg-white/6 text-slate-200" : "bg-slate-100 text-slate-700"} disabled:opacity-60`}>
                    Enviar una prueba
                </button>
            )}
        </div>
    );
}
