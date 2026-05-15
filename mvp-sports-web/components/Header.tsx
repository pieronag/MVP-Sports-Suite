"use client";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import {
  SunIcon,
  MoonIcon,
  ArrowRightStartOnRectangleIcon
} from "@heroicons/react/24/outline";

export default function Header() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <header className="h-16 w-full flex items-center justify-end px-4 md:px-8 sticky top-0 z-30 transition-all duration-300
                       backdrop-blur-md border-b
                       bg-white/90 border-slate-200 
                       dark:bg-[#0B0F19]/90 dark:border-white/5">

      {/* TODAS LAS ACCIONES SIEMPRE A LA DERECHA */}
      <div className="flex items-center gap-3 md:gap-4">

        {/* Sistema Online badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border 
                        bg-slate-50 border-slate-200 
                        dark:bg-white/5 dark:border-white/5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 dark:bg-[#4ADE80]"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 dark:bg-[#4ADE80] dark:shadow-[0_0_8px_#4ADE80]"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
            SISTEMA ONLINE
          </span>
        </div>

        {/* Toggle Theme */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-all active:scale-95 border border-transparent
                       text-slate-500 hover:bg-slate-100 hover:text-amber-500
                       dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-yellow-400 dark:hover:border-white/5"
          aria-label="Cambiar tema"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </button>

        {/* Separador */}
        <div className="h-6 w-px bg-slate-200 dark:bg-white/10"></div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95
                       bg-red-50 text-red-600 hover:bg-red-100
                       dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:border dark:border-red-500/20"
        >
          <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
            SALIR
          </span>
        </button>

      </div>
    </header>
  );
}
