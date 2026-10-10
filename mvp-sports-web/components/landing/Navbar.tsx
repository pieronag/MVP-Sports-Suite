"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import BrandLogo from "../BrandLogo";

const NAV_LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#player-functions", label: "Jugadores" },
  { href: "#owners", label: "Recintos" },
  { href: "#planes", label: "Planes" },
];

export default function Navbar({ onRegisterClick }: { onRegisterClick: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
          const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
          setScrollProgress(height > 0 ? (winScroll / height) * 100 : 0);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.classList.add("overflow-hidden");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Scroll progress hairline */}
      <div className="fixed top-0 left-0 w-full h-px z-110 pointer-events-none" aria-hidden="true">
        <div
          className="h-full bg-linear-to-r from-[#00df82] via-mvp-cyan to-[#00df82] transition-[width] duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <header
        className={`fixed left-1/2 -translate-x-1/2 z-100 w-[95%] max-w-[1180px] transition-all duration-500 ${
          scrolled ? "top-3" : "top-6"
        }`}
      >
        <nav
          aria-label="Navegación principal"
          className={`relative flex items-center justify-between rounded-md border px-4 sm:px-5 backdrop-blur-2xl transition-all duration-500 ${
            scrolled
              ? "py-2.5 bg-slate-950/85 border-[#00df82]/30 shadow-[0_10px_40px_-14px_rgba(0,223,130,0.55)]"
              : "py-3.5 bg-slate-950/40 border-[#00df82]/15"
          }`}
        >
          {/* top gradient hairline */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-[#00df82] to-transparent"
          />

          <Link href="/" aria-label="MVP Sports, ir al inicio" className="group flex items-center">
            <BrandLogo size={scrolled ? 34 : 38} wordmarkClassName="text-base sm:text-lg" priority />
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3.5 py-2 rounded-md transition-colors hover:text-[#00df82] hover:bg-[#00df82]/5"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:block px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 hover:text-[#00df82] transition-colors"
            >
              Ingresar
            </Link>
            <button
              onClick={onRegisterClick}
              className="hidden sm:inline-flex items-center px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 bg-[#00df82] rounded-md hover:bg-[#3affa0] transition-all shadow-[0_0_25px_rgba(0,223,130,0.35)] hover:shadow-[0_0_35px_rgba(0,223,130,0.5)] active:scale-95 cursor-pointer"
            >
              Registrarme
            </button>

            <button
              className="lg:hidden p-2 text-white hover:bg-white/5 rounded-md transition-all"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMobileMenuOpen ? (
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={1.8} />
              ) : (
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={1.8} />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        aria-hidden={!isMobileMenuOpen}
        className={`fixed inset-0 z-90 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 lg:hidden ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full pt-28 pb-10 px-8">
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-4 text-lg font-black text-white uppercase tracking-[0.2em] rounded-md hover:bg-white/5 hover:text-[#00df82] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <Link
              href="/login"
              className="py-4 text-center text-sm font-black uppercase tracking-[0.2em] text-white border border-white/10 rounded-md hover:bg-white/5"
            >
              Ingresar
            </Link>
            <button
              onClick={() => {
                onRegisterClick();
                setIsMobileMenuOpen(false);
              }}
              className="py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950 bg-[#00df82] rounded-md shadow-[0_0_35px_rgba(0,223,130,0.35)] cursor-pointer"
            >
              Registrarme
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
