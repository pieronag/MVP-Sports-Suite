"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth, functions, db } from "../../services/firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext"; // Importamos AuthContext

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
      const target = role && role !== 'player' ? '/dashboard' : '/player';
      router.push(target);
    }
  }, [user, router, role]);

  const handleResendVerification = async () => {
    if (!email) return;
    setResending(true);
    setResendStatus("");
    try {
      const sendAuthEmailFn = httpsCallable(functions, 'sendAuthEmail');
      await sendAuthEmailFn({
        email: email.trim(),
        type: 'verify',
      });
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

        const exemptRoles = ["manager", "owner", "admin", "superadmin", "player"];
        const isExempt = userRole && exemptRoles.includes(userRole);

        if (!user.emailVerified && !isExempt) {
            setError("Por favor, verifica tu correo antes de ingresar. Te enviamos un enlace de activación.");
            await auth.signOut();
            setLoading(false);
            return;
        }
        
        const target = userRole && userRole !== 'player' ? '/dashboard' : '/player';
        router.push(target); 
    } catch (err: any) {
        setError("Credenciales incorrectas.");
        setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    // ELIMINADAS LAS CLASES DE TRANSICIÓN (duration-300, ease, etc.)
    <div className="min-h-screen w-full flex overflow-hidden relative bg-[#F3F4F6] dark:bg-[#020611]">
      
      {/* --- TEXTURA DE RUIDO --- */}
      <div className="absolute inset-0 bg-noise pointer-events-none z-50 opacity-40 mix-blend-overlay"></div>



      {/* --- BOTÓN SWITCH (INSTANTÁNEO) --- */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 p-2.5 rounded-full 
                   bg-white/50 dark:bg-black/30 backdrop-blur-md
                   border border-white/40 dark:border-white/10
                   shadow-sm hover:scale-105 active:scale-95 group"
      >
        {theme === 'dark' ? (
           <svg className="w-4 h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)]" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
           </svg>
        ) : (
           <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-900" fill="currentColor" viewBox="0 0 24 24">
             <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
           </svg>
        )}
      </button>

      {/* --- COLUMNA IZQUIERDA --- */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden border-r border-slate-200/50 dark:border-white/5 bg-white dark:bg-black">
        
        {/* LIGHT MODE: Malla */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] 
                        opacity-100 dark:opacity-0"></div>

        {/* DARK MODE: Aurora Boreal */}
        <div className="absolute inset-0 opacity-0 dark:opacity-100">
            <div className="absolute inset-0 bg-gradient-to-r from-[#020611] via-[#050b14] to-[#000000]"></div>
            <div className="absolute -inset-[100%] opacity-40 animate-aurora blur-[100px]
                            bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)]
                            dark:bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#ccff00_50%,#00e0ff)]">
            </div>
        </div>
        
        <div className="relative z-20 flex flex-col items-center text-center p-12">
            <div className={`relative w-40 h-40 mb-6 transform hover:scale-105 cursor-pointer
                            ${theme === 'light' 
                                ? 'drop-shadow-xl grayscale brightness-0 opacity-80' 
                                : 'drop-shadow-[0_0_50px_rgba(0, 223, 130,0.4)] filter-none'}`}>
                <Image src="/Logo.png" alt="MVP Sports Logo" fill className="object-contain" priority />
            </div>
            
            <h1 className="text-5xl font-heading font-black tracking-tighter mb-3 leading-none text-slate-900 dark:text-white">
                MVP <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-mvp-volt dark:to-mvp-cyan">SPORTS</span>
            </h1>
            
            <div className="h-1 w-16 mb-6 rounded-full bg-slate-200 dark:bg-gradient-to-r dark:from-mvp-volt dark:to-transparent"></div>
            
            <p className="text-sm max-w-sm font-medium leading-relaxed tracking-wide text-slate-500 dark:text-slate-400">
                La plataforma definitiva para la gestión de complejos deportivos de alto rendimiento.
            </p>
        </div>
      </div>

      {/* --- COLUMNA DERECHA --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-20 bg-white/90 dark:bg-[#020611]/80 backdrop-blur-sm">
        
        <div className="w-full max-w-[340px] mx-auto">
            <div className="lg:hidden text-center mb-8">
                <div className={`relative w-16 h-16 mx-auto mb-4 ${theme === 'light' ? 'brightness-0' : ''}`}>
                    <Image src="/Logo.png" alt="Logo" fill className="object-contain"/>
                </div>
            </div>

            <div className="mb-8">
                <h2 className="text-2xl font-heading font-black tracking-tight text-slate-900 dark:text-white mb-1">
                    Iniciar Sesión
                </h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-500">
                    Bienvenido de nuevo al panel de control.
                </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
                
                {/* Email Input Flotante Compacto */}
                <div className="relative group">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        id="email"
                        className="peer w-full px-4 py-3.5 rounded-lg border outline-none text-sm
                                   bg-transparent 
                                   text-slate-900 dark:text-white font-semibold
                                   border-slate-300 dark:border-slate-800
                                   focus:border-blue-600 dark:focus:border-mvp-volt
                                   placeholder-transparent"
                        placeholder="Email"
                    />
                    <label 
                        htmlFor="email"
                        className="absolute left-4 -top-2 px-1 text-[10px] font-bold 
                                   bg-white dark:bg-[#020611] rounded
                                   text-slate-400 
                                   peer-placeholder-shown:text-xs peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 
                                   peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-blue-600 dark:peer-focus:text-mvp-volt"
                    >
                        EMAIL CORPORATIVO
                    </label>
                </div>

                {/* Password Input Flotante Compacto */}
                <div className="relative group">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        id="password"
                        className="peer w-full px-4 py-3.5 rounded-lg border outline-none text-sm
                                   bg-transparent pr-12
                                   text-slate-900 dark:text-white font-semibold
                                   border-slate-300 dark:border-slate-800
                                   focus:border-blue-600 dark:focus:border-mvp-volt
                                   placeholder-transparent"
                        placeholder="Password"
                    />
                    <label 
                        htmlFor="password"
                        className="absolute left-4 -top-2 px-1 text-[10px] font-bold
                                   bg-white dark:bg-[#020611] rounded
                                   text-slate-400 
                                   peer-placeholder-shown:text-xs peer-placeholder-shown:text-slate-400 peer-placeholder-shown:top-3.5 
                                   peer-focus:-top-2 peer-focus:text-[10px] peer-focus:text-blue-600 dark:peer-focus:text-mvp-volt"
                    >
                        CONTRASEÑA
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>


                {error && (
                    <div className="flex flex-col gap-2">
                        <div className="p-2.5 rounded-lg flex items-center gap-2 animate-shake
                                        bg-red-50 border border-red-200 text-red-600
                                        dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
                            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-[10px] font-bold">{error}</span>
                        </div>
                        {(error.includes("verifica tu correo") || error.includes("verify") || error.toLowerCase().includes("email not verified")) && (
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={resending}
                                className="text-left text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-mvp-volt hover:underline disabled:opacity-50"
                            >
                                {resending ? "Reenviando..." : "Reenviar enlace de activación"}
                            </button>
                        )}
                        {resendStatus && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                                {resendStatus}
                            </span>
                        )}
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className={`
                        w-full py-3.5 rounded-lg font-heading font-black text-xs uppercase tracking-widest shadow-lg relative overflow-hidden group
                        ${loading 
                            ? 'bg-slate-200 text-transparent cursor-not-allowed dark:bg-slate-800' 
                            : 'bg-slate-900 text-white hover:bg-black hover:shadow-xl dark:bg-mvp-green dark:text-black dark:hover:bg-[#b8e600] dark:hover:shadow-[0_0_40px_rgba(0,223,130,0.5)] dark:border dark:border-mvp-green/50 hover:-translate-y-0.5'
                        }
                    `}
                >
                    <span className={`flex items-center justify-center gap-2 relative z-10 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                        Ingresar
                        <svg className="w-3 h-3 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </span>
                    
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="animate-spin h-4 w-4 text-slate-500 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        </div>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full py-3 rounded-lg font-heading font-black text-[10px] uppercase tracking-widest 
                               bg-transparent border border-slate-200 dark:border-slate-800/80
                               text-slate-500 dark:text-slate-400
                               hover:bg-slate-50 dark:hover:bg-white/5
                               hover:text-slate-900 dark:hover:text-white
                               transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver al Inicio
                </button>
            </form>

            <p className="text-center text-[9px] mt-6 font-semibold text-slate-400 dark:text-slate-500 leading-normal uppercase tracking-wider">
              Al ingresar, aceptas nuestros{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-slate-700 dark:text-slate-300 underline hover:text-blue-600 dark:hover:text-mvp-volt transition-colors">
                Términos y Condiciones
              </a>{" "}
              y la{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-700 dark:text-slate-300 underline hover:text-blue-600 dark:hover:text-mvp-volt transition-colors">
                Política de Privacidad
              </a>.
            </p>

            <p className="text-center text-[9px] mt-4 font-bold tracking-widest uppercase text-slate-400 dark:text-slate-600">
                MVP SPORTS CHILE • 2026
            </p>
        </div>
      </div>
    </div>
  );
}
