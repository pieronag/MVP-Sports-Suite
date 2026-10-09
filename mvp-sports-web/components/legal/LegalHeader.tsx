"use client";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import BrandLogo from "../BrandLogo";

export interface LegalSection {
  id: string;
  name: string;
}

interface LegalHeaderProps {
  sections: LegalSection[];
  onSectionClick: (id: string) => void;
  onRegisterClick: () => void;
}

export default function LegalHeader({ sections, onSectionClick, onRegisterClick }: LegalHeaderProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-[100] border-b border-white/5 bg-slate-950/85 backdrop-blur-xl">
      <div className="container mx-auto px-6 max-w-6xl h-16 flex items-center justify-between gap-4">
        <Link href="/" aria-label="MVP Sports, ir al inicio" className="flex items-center">
          <BrandLogo size={34} wordmarkClassName="text-base sm:text-lg" priority />
        </Link>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Volver al inicio</span>
          </Link>
          <button
            onClick={onRegisterClick}
            className="px-4 sm:px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-950 bg-[#00df82] rounded-md hover:bg-[#3affa0] transition-all shadow-[0_0_25px_-8px_rgba(0,223,130,0.7)] active:scale-95 cursor-pointer"
          >
            Registrarme
          </button>
        </div>
      </div>

      {/* Mobile: secciones de la página */}
      <div className="lg:hidden border-t border-white/5 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-6 py-2.5 w-max">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className="whitespace-nowrap px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-300 hover:text-white hover:border-[#00df82]/40 transition-all cursor-pointer"
            >
              {section.name}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
