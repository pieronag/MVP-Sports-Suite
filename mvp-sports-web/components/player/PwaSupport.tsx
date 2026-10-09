"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "mvp-pwa-install-dismissed";

const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Registra el service worker del área Jugador y ofrece instalar la app.
// En desarrollo no se registra para no cachear bundles de HMR.
export default function PwaSupport() {
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [showIosHint, setShowIosHint] = useState(false);
    const [hidden, setHidden] = useState(true);

    useEffect(() => {
        if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
            navigator.serviceWorker.register("/player/sw.js", { scope: "/player" }).catch((err) => {
                console.warn("SW registro falló:", err);
            });
        }

        if (isStandalone()) return;
        try {
            if (localStorage.getItem(DISMISS_KEY)) return;
        } catch { /* storage bloqueado: mostramos igual */ }

        const onPrompt = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setHidden(false);
        };
        window.addEventListener("beforeinstallprompt", onPrompt);

        // iOS Safari no emite beforeinstallprompt: mostramos instrucciones
        const ua = navigator.userAgent;
        const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
        if (isIos) {
            setShowIosHint(true);
            setHidden(false);
        }

        const onInstalled = () => setHidden(true);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    const dismiss = () => {
        setHidden(true);
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
    };

    const install = async () => {
        if (!deferred) return;
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        setDeferred(null);
        if (outcome === "accepted") setHidden(true);
        else dismiss();
    };

    if (hidden) return null;

    return (
        <div className="lg:hidden fixed inset-x-3 z-40 bottom-[calc(76px+env(safe-area-inset-bottom))] animate-fadeIn">
            <div className="flex items-center gap-3 p-3 rounded-md border border-emerald-500/20 bg-[#0F172A]/95 backdrop-blur-md text-slate-200">
                <Image src="/icons/pwa-192.png" alt="" width={40} height={40} className="rounded-md shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider">Instala MVP Sports</p>
                    {showIosHint ? (
                        <p className="text-[11px] text-slate-400 leading-snug">
                            Toca <Share size={12} className="inline -mt-0.5" /> y luego «Agregar a inicio».
                        </p>
                    ) : (
                        <p className="text-[11px] text-slate-400 leading-snug">Acceso directo, pantalla completa y modo sin conexión.</p>
                    )}
                </div>
                {!showIosHint && deferred && (
                    <button onClick={install} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#00df82] text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        <Download size={14} /> Instalar
                    </button>
                )}
                <button onClick={dismiss} aria-label="Cerrar" className="shrink-0 p-1.5 text-slate-500">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
