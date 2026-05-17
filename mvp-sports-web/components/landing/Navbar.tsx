"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export default function Navbar({ onRegisterClick }: { onRegisterClick: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled_val = (winScroll / height) * 100;
      setScrollProgress(scrolled_val);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-0.5 z-[110] pointer-events-none">
        <div 
          className="h-full bg-[#00df82] shadow-[0_0_10px_#00df82] transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <nav className={`fixed left-1/2 -translate-x-1/2 z-[100] flex items-center justify-between w-[95%] max-w-[1200px] px-6 md:px-10 transition-all duration-500 rounded-[2rem] 
        ${scrolled ? "top-4 py-3 bg-slate-950/90 border-white/20 shadow-2xl scale-[0.98] md:scale-95" : "top-8 py-5 bg-slate-950/40 border-white/10"}`}
      >
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/" className="relative w-10 h-10 md:w-12 md:h-12 group cursor-pointer overflow-hidden rounded-xl border border-white/5">
            <div className="absolute inset-0 bg-[#00df82] blur-md opacity-0 group-hover:opacity-40 transition-opacity" />
            <Image 
              src="/Logo.png" 
              alt="MVP Sports Logo" 
              width={48} 
              height={48} 
              className="relative z-10 w-full h-full object-cover scale-[1.4] transition-transform duration-500 group-hover:scale-[1.5]" 
            />
          </Link>
          <span className="text-base md:text-lg font-black text-white tracking-tighter uppercase font-heading">MVP SPORTS</span>
        </div>
        
        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
          <Link href="#" className="hover:text-white transition-colors relative group">
            Inicio
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00df82] group-hover:w-full transition-all" />
          </Link>
          <Link href="#player-functions" className="hover:text-white transition-colors relative group">
            Jugadores
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00df82] group-hover:w-full transition-all" />
          </Link>
          <Link href="#owners" className="hover:text-white transition-colors relative group">
            Recintos
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00df82] group-hover:w-full transition-all" />
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <Link 
            href="/login" 
            className="hidden sm:block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-all"
          >
            Ingresar
          </Link>
          <button 
            onClick={onRegisterClick}
            className="hidden sm:block px-6 md:px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-950 bg-[#00df82] rounded-xl hover:bg-[#00c975] transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,223,130,0.3)]"
          >
            Registrarme
          </button>
          
          {/* Mobile Toggle */}
          <button 
            className="lg:hidden p-2 text-white hover:bg-white/5 rounded-xl transition-all"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[90] bg-slate-950 transition-all duration-500 lg:hidden ${isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}>
        <div className="flex flex-col items-center justify-center h-full gap-8 text-center pt-20">
          <div className="space-y-6 flex flex-col items-center">
            <Link href="#" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-black text-white uppercase tracking-[0.3em] hover:text-[#00df82] transition-colors">Inicio</Link>
            <Link href="#player-functions" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-black text-white uppercase tracking-[0.3em] hover:text-[#00df82] transition-colors">Jugadores</Link>
            <Link href="#owners" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-black text-white uppercase tracking-[0.3em] hover:text-[#00df82] transition-colors">Recintos</Link>
          </div>
          
          <div className="w-4/5 h-px bg-white/10" />
          
          <div className="flex flex-col gap-6 w-full px-10">
            <Link 
              href="/login" 
              className="py-4 text-sm font-black uppercase tracking-[0.3em] text-white border border-white/10 rounded-2xl hover:bg-white/5"
            >
              Ingresar
            </Link>
            <button 
              onClick={() => { onRegisterClick(); setIsMobileMenuOpen(false); }}
              className="py-5 text-sm font-black uppercase tracking-[0.3em] text-slate-950 bg-[#00df82] rounded-2xl shadow-[0_0_40px_rgba(0,223,130,0.3)]"
            >
              Registrarme
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


