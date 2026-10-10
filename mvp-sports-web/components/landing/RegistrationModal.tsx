"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle02Icon, AlertCircleIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { auth, db } from "@/services/client/firebase";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { emailService } from "@/services/client/emailService";
import { newPlayerDoc, signInWithGoogle } from "@/services/client/accountService";
import GoogleButton from "@/components/shared/GoogleButton";

// Registro en un paso: entrar rápido y completar teléfono, RUT y fecha de nacimiento antes del primer pago.
export default function RegistrationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"" | "email" | "google">("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setForm({ displayName: "", email: "", password: "" });
    setAcceptTerms(false); setSuccess(false); setError(""); setShowPassword(false);
    document.body.classList.add("overflow-hidden");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("overflow-hidden"); window.removeEventListener("keydown", onKey); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const valid = form.displayName.trim().length >= 2 && emailOk && form.password.length >= 6 && acceptTerms;

  const handleGoogle = async () => {
    if (!acceptTerms) { setError("Acepta los Términos y la Política de Privacidad para continuar."); return; }
    setLoading("google"); setError("");
    try {
      await signInWithGoogle();
      onClose();
      router.push("/player");
    } catch (e: any) {
      if (e?.code !== "auth/popup-closed-by-user") setError("No pudimos iniciar sesión con Google. Intenta de nuevo.");
      setLoading("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading("email"); setError("");
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(user, { displayName: form.displayName.trim() });
      await setDoc(doc(db, "users", user.uid), newPlayerDoc(user, form.displayName.trim()), { merge: true });
      await emailService.sendAuthEmail(form.email.trim(), "verify", form.displayName.trim()).catch(() => undefined);
      await signOut(auth);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.code === "auth/email-already-in-use" ? "Ese correo ya tiene una cuenta. Inicia sesión." : "No se pudo crear la cuenta. Intenta de nuevo.");
    } finally { setLoading(""); }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200" onClick={onClose} role="presentation">
      <div
        role="dialog" aria-modal="true" aria-labelledby="register-title" onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-slate-900/70 border border-white/10 rounded-md shadow-[0_0_120px_-20px_rgba(0,223,130,0.35)] overflow-hidden animate-in zoom-in-95 duration-300"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-[#00df82]/15 blur-[110px] rounded-full" />
        <button onClick={onClose} aria-label="Cerrar registro" className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors rounded-md cursor-pointer">
          <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
        </button>

        {!success ? (
          <div className="relative z-10 p-6 sm:p-8 overflow-y-auto space-y-5">
            <div>
              <span className="text-[11px] font-black text-[#00df82] uppercase tracking-[0.3em]">Crea tu cuenta gratis</span>
              <h2 id="register-title" className="text-2xl sm:text-3xl font-black text-white font-heading uppercase tracking-tighter mt-1">
                Únete a la <span className="text-gradient">élite.</span>
              </h2>
              <p className="text-xs text-slate-400 mt-2">Entra en segundos. Te pediremos el resto de tus datos antes de tu primera reserva.</p>
            </div>

            <label htmlFor="acceptTerms" className="flex items-start gap-3 rounded-md border border-white/5 bg-white/2 p-3 cursor-pointer">
              <input type="checkbox" id="acceptTerms" checked={acceptTerms} onChange={(e) => { setAcceptTerms(e.target.checked); setError(""); }} className="mt-0.5 accent-[#00df82] h-4 w-4 cursor-pointer" />
              <span className="text-[11px] text-slate-400 font-medium leading-relaxed select-none">
                Acepto los <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#00df82]">Términos y Condiciones</a> y
                la <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#00df82]">Política de Privacidad</a>.
              </span>
            </label>

            <GoogleButton onClick={handleGoogle} loading={loading === "google"} disabled={!!loading} label="Continuar con Google" />

            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              <span className="h-px flex-1 bg-white/10" /> o con tu correo <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input label="Nombre" name="displayName" value={form.displayName} onChange={(e: any) => setForm({ ...form, displayName: e.target.value })} placeholder="Juan Pérez" autoComplete="name" />
              <Input label="Correo" name="email" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} placeholder="usuario@email.com" autoComplete="email" />
              <Input
                label="Contraseña" name="password" type={showPassword ? "text" : "password"} value={form.password}
                onChange={(e: any) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                rightSlot={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="text-slate-400 hover:text-[#00df82] cursor-pointer">
                    <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                }
              />
              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[11px] font-bold text-red-300">
                  <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 shrink-0" strokeWidth={1.8} /> {error}
                </div>
              )}
              <button type="submit" disabled={!valid || !!loading}
                className="w-full py-3.5 bg-[#00df82] text-slate-950 font-black rounded-md text-[11px] uppercase tracking-[0.15em] shadow-[0_0_25px_-8px_rgba(0,223,130,0.6)] hover:bg-[#3affa0] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                {loading === "email" ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>
          </div>
        ) : (
          <div className="relative z-10 p-8 sm:p-10 text-center space-y-6">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-14 h-14 mx-auto text-[#00df82]" strokeWidth={1.6} />
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white font-heading uppercase tracking-tighter">¡Cuenta creada!</h2>
              <p className="text-sm text-slate-400 max-w-[320px] mx-auto leading-relaxed">
                Te enviamos un correo a <strong className="text-white">{form.email}</strong>. Confirma tu cuenta con el enlace y luego inicia sesión.
              </p>
            </div>
            <button type="button" onClick={() => { onClose(); router.push("/login"); }}
              className="px-8 py-3 bg-[#00df82] text-slate-950 font-black rounded-md text-[11px] uppercase tracking-[0.15em] hover:bg-[#3affa0] transition-all cursor-pointer">
              Ir a iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, rightSlot, ...props }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={props.name} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</label>
      <div className="relative">
        <input id={props.name}
          className={`w-full bg-white/5 border border-white/10 rounded-md px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#00df82] focus:ring-2 focus:ring-[#00df82]/20 outline-hidden transition-all ${rightSlot ? "pr-11" : ""}`}
          {...props} />
        {rightSlot && <div className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</div>}
      </div>
    </div>
  );
}
