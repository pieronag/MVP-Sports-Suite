"use client";
import { useState } from "react";
import type { User } from "firebase/auth";
import { emailService } from "@/services/client/emailService";
import { useAuth } from "@/context/AuthContext";
import { Mail, LogOut, CheckCircle } from "@/components/player/icons";

// Bloquea el área Jugador hasta que el correo esté verificado.
// Solo aplica a cuentas con contraseña (Google ya viene verificado).
export function needsEmailVerification(user: User | null, role?: string | null): boolean {
    if (!user || user.emailVerified) return false;
    if (role && ["manager", "owner", "admin", "superadmin", "staff"].includes(role)) return false;
    return user.providerData.some((p) => p.providerId === "password");
}

export default function VerifyEmailGate({ user, onVerified }: { user: User; onVerified: () => void }) {
    const { logout } = useAuth();
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);

    const resend = async () => {
        setBusy(true);
        setStatus("");
        try {
            await emailService.sendAuthEmail(user.email || "", "verify");
            setStatus("Te enviamos un nuevo enlace. Revisa tu bandeja de entrada y spam.");
        } catch {
            setStatus("No se pudo enviar el correo. Inténtalo en unos minutos.");
        } finally {
            setBusy(false);
        }
    };

    const checkAgain = async () => {
        setBusy(true);
        setStatus("");
        try {
            await user.reload();
            if (user.emailVerified) {
                await user.getIdToken(true); // el token debe reflejar email_verified
                onVerified();
            } else {
                setStatus("Aún no vemos tu correo verificado. Abre el enlace del correo y vuelve a intentar.");
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020611] text-slate-200 flex items-center justify-center px-6">
            <div className="w-full max-w-sm text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Mail size={30} className="text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-[18px] font-black tracking-tight">Verifica tu <span className="text-[#00df82]">correo</span></h1>
                    <p className="mt-2 text-[13px] text-slate-400">
                        Enviamos un enlace de activación a <span className="text-slate-200 font-semibold">{user.email}</span>. Ábrelo para usar tu cuenta.
                    </p>
                </div>
                <button onClick={checkAgain} disabled={busy}
                    className="w-full py-3.5 rounded-md bg-[#00df82] text-slate-950 text-[12px] font-black disabled:opacity-50 flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Ya verifiqué mi correo
                </button>
                <button onClick={resend} disabled={busy}
                    className="w-full py-3 rounded-md border border-white/10 text-[12px] font-bold text-slate-300 disabled:opacity-50">
                    Reenviar enlace
                </button>
                {status && <p role="status" className="text-[11px] text-slate-400">{status}</p>}
                <button onClick={() => logout()} className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-500 hover:text-red-400">
                    <LogOut size={14} /> Usar otra cuenta
                </button>
            </div>
        </div>
    );
}
