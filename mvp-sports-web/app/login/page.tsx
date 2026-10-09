"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sun01Icon,
  Moon01Icon,
  ViewIcon,
  ViewOffIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  AlertCircleIcon,
  Mail01Icon,
  SquareLock01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { auth, functions, db } from "../../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { emailService } from "@/services/emailService";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../../components/BrandLogo";

const TRUST_POINTS = ["Reserva canchas en segundos", "Paga online con Mercado Pago", "Gestiona tu complejo"];

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, role } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (user) {
      const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const target = isMobile ? "/player" : role && role !== "player" ? "/dashboard" : "/player";
      router.push(target);
    }
  }, [user, router, role]);

  const handleResendVerification = async () => {
    if (!email) return;
    setResending(true);
    setResendStatus("");
    try {
      await emailService.sendAuthEmail(email.trim(), "verify");
      setResendStatus("Enlace enviado con éxito. Revisa tu bandeja de entrada.");
    } catch (err) {
      console.error(err);
      setResendStatus("No se pudo enviar el correo. Por favor, inténtalo más tarde.");
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResendStatus("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let userRole = null;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          userRole = userDoc.data().role;
        } else {
          const profileDoc = await getDoc(doc(db, "profiles", user.uid));
          if (profileDoc.exists()) {
            userRole = profileDoc.data().role || "player";
          }
        }
      } catch (dbErr) {
        console.error("Error al obtener rol del usuario durante login:", dbErr);
      }

      // Los jugadores deben verificar su correo; las cuentas de personal las crea un administrador
      const exemptRoles = ["manager", "owner", "admin", "superadmin", "staff"];
      const isExempt = userRole && exemptRoles.includes(userRole);

      if (!user.emailVerified && !isExempt) {
        setError("Por favor, verifica tu correo antes de ingresar. Te enviamos un enlace de activación.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      const target = userRole && userRole !== "player" ? "/dashboard" : "/player";
      router.push(target);
    } catch (err: any) {
      const code = err?.code || "";
      setError(
        code === "auth/too-many-requests" ? "Demasiados intentos. Espera unos minutos o restablece tu contraseña."
        : code === "auth/network-request-failed" ? "Sin conexión. Revisa tu internet e inténtalo de nuevo."
        : code === "auth/user-disabled" ? "Tu cuenta está deshabilitada. Contacta a soporte."
        : "Credenciales incorrectas."
      );
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError("Escribe tu correo para enviarte el enlace."); return; }
    setResending(true);
    setResendStatus("");
    try {
      await emailService.sendAuthEmail(email.trim(), "reset");
      setError("");
      setResendStatus("Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.");
    } catch {
      setResendStatus("No se pudo enviar el correo. Inténtalo más tarde.");
    } finally {
      setResending(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-[#020611] text-slate-900 dark:text-slate-200">
      {/* ============ COLUMNA IZQUIERDA (BRANDING) ============ */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden border-r border-slate-200 dark:border-white/5 bg-gradient-to-br from-white via-emerald-50/50 to-white dark:from-[#020611] dark:via-[#04140f] dark:to-[#020611]">
        {/* grilla light */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60 dark:hidden"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* grilla dark */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden dark:block opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* glows */}
        <div aria-hidden="true" className="absolute -top-[12%] -left-[10%] w-[520px] h-[520px] bg-emerald-400/25 dark:bg-[#00df82]/15 blur-[140px] rounded-full" />
        <div aria-hidden="true" className="absolute -bottom-[18%] -right-[12%] w-[460px] h-[460px] bg-lime-300/20 dark:bg-emerald-500/10 blur-[140px] rounded-full" />

        <div className="relative z-10 flex flex-col items-start text-left px-14 max-w-lg">
          <BrandLogo size={60} wordmarkClassName="text-2xl" appearance="auto" />

          <h1 className="text-4xl xl:text-5xl font-black tracking-tighter leading-[0.95] mt-10 mb-5 uppercase font-heading">
            GESTIONA TU <br />
            <span className="text-gradient">MUNDO DEPORTIVO.</span>
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-md">
            Reserva canchas, administra tu complejo y sigue tu progreso desde una sola plataforma.
          </p>

          <ul className="mt-9 space-y-3.5">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:bg-[#00df82]/15 dark:text-[#00df82] shrink-0">
                  <HugeiconsIcon icon={Tick02Icon} className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ============ COLUMNA DERECHA (FORM) ============ */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center p-6 sm:p-8">
        {/* theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          className="absolute top-6 right-6 z-20 p-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-[#00df82] hover:border-emerald-300 dark:hover:border-[#00df82]/40 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <HugeiconsIcon icon={theme === "dark" ? Sun01Icon : Moon01Icon} className="w-5 h-5" strokeWidth={1.8} />
        </button>

        <div className="w-full max-w-[390px]">
          {/* mobile brand */}
          <div className="lg:hidden flex justify-center mb-8">
            <BrandLogo size={48} wordmarkClassName="text-2xl" appearance="auto" />
          </div>

          <div className="relative rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 shadow-xl shadow-slate-200/60 dark:shadow-[0_0_90px_-35px_rgba(0,223,130,0.45)] backdrop-blur-xl overflow-hidden">
            {/* top hairline */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 dark:via-[#00df82]/60 to-transparent" />
            {/* glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-0 w-[320px] h-[180px] bg-emerald-400/20 dark:bg-[#00df82]/12 blur-[110px] rounded-full" />

            <div className="relative z-10 p-7 sm:p-8">
              <span className="text-[11px] font-black text-emerald-600 dark:text-[#00df82] uppercase tracking-[0.3em]">Acceso</span>
              <h2 className="text-2xl font-black tracking-tighter uppercase font-heading mt-1">
                Iniciar sesión
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Bienvenido de nuevo. Ingresa a tu cuenta para continuar.
              </p>

              <form onSubmit={handleLogin} className="mt-7 space-y-4">
                <Field
                  label="Email"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="usuario@email.com"
                  autoComplete="email"
                  icon={Mail01Icon}
                />

                <Field
                  label="Contraseña"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  icon={SquareLock01Icon}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors cursor-pointer"
                    >
                      <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="w-4 h-4" strokeWidth={1.8} />
                    </button>
                  }
                />

                <div className="flex justify-end -mt-1">
                  <button type="button" onClick={handleForgotPassword} disabled={resending}
                    className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-emerald-600 dark:hover:text-[#00df82] disabled:opacity-50">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {!error && resendStatus && (
                  <span role="status" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">{resendStatus}</span>
                )}

                {error && (
                  <div role="alert" className="space-y-2">
                    <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-[11px] font-bold text-red-600 dark:text-red-300">
                      <HugeiconsIcon icon={AlertCircleIcon} className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                      {error}
                    </div>
                    {(error.includes("verifica tu correo") || error.includes("verify") || error.toLowerCase().includes("email not verified")) && (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="text-left text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600 dark:text-[#00df82] hover:underline disabled:opacity-50"
                      >
                        {resending ? "Reenviando..." : "Reenviar enlace de activación"}
                      </button>
                    )}
                    {resendStatus && (
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {resendStatus}
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-3.5 rounded-md font-black text-[11px] uppercase tracking-[0.18em] bg-[#00df82] text-slate-950 shadow-[0_10px_30px_-12px_rgba(0,223,130,0.8)] hover:bg-[#00c975] dark:hover:bg-[#3affa0] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer overflow-hidden group"
                >
                  <span className={`flex items-center justify-center gap-2 ${loading ? "opacity-0" : "opacity-100"}`}>
                    Ingresar
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                  </span>
                  {loading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-4 w-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
                    </span>
                  )}
                </button>

                <Link
                  href="/"
                  className="w-full py-3 rounded-md font-black text-[10px] uppercase tracking-[0.18em] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2} />
                  Volver al inicio
                </Link>
              </form>
            </div>
          </div>

          <p className="text-center text-[10px] mt-6 font-semibold text-slate-400 dark:text-slate-500 leading-relaxed uppercase tracking-wider">
            Al ingresar, aceptas nuestros{" "}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-300 underline hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors">
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-300 underline hover:text-emerald-600 dark:hover:text-[#00df82] transition-colors">
              Política de Privacidad
            </Link>.
          </p>

          <p className="text-center text-[10px] mt-4 font-bold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-600">
            MVP Sports Chile · 2026
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, icon: Icon, rightSlot, ...props }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em]">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 pointer-events-none">
            <HugeiconsIcon icon={Icon} className="w-4 h-4" strokeWidth={1.8} />
          </span>
        )}
        <input
          id={id}
          className={`w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-emerald-500 dark:focus:border-[#00df82] focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-[#00df82]/20 outline-none transition-all ${Icon ? "pl-10" : "pl-4"} ${rightSlot ? "pr-11" : "pr-4"}`}
          {...props}
        />
        {rightSlot && <span className="absolute inset-y-0 right-3 flex items-center">{rightSlot}</span>}
      </div>
    </div>
  );
}
