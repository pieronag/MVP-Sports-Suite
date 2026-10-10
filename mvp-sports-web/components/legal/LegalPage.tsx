"use client";

import { useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import LegalHeader from "./LegalHeader";
import Footer from "../landing/Footer";
import RegistrationModal from "../landing/RegistrationModal";
import ScrollToTop from "../landing/ScrollToTop";
import { LEGAL_ENTITY } from "./entity";

export interface LegalSection {
  id: string;
  name: string;
  icon: any;
  content: ReactNode;
}

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (!element) return;
  const top = element.getBoundingClientRect().top - document.body.getBoundingClientRect().top;
  window.scrollTo({ top: top - 96, behavior: "smooth" });
};

export default function LegalPage({
  eyebrow,
  title,
  highlight,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  highlight: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-[#00df82] selection:text-slate-950 font-sans">
      <LegalHeader sections={sections} onSectionClick={scrollToSection} onRegisterClick={() => setIsRegisterOpen(true)} />

      <section className="relative overflow-hidden pt-32 md:pt-40 lg:pt-32 pb-12 md:pb-20 border-b border-white/5">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        <div aria-hidden="true" className="absolute -top-20 left-1/4 w-[360px] h-[360px] bg-[#00df82]/12 blur-[130px] rounded-full" />
        <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10 text-center">
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#00df82] bg-[#00df82]/10 px-4 py-2 rounded-md border border-[#00df82]/20">
            {eyebrow}
          </span>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white mt-6 mb-4 font-heading">
            {title} <span className="text-gradient">{highlight}</span>
          </h1>
          <p className="text-[11px] md:text-sm text-slate-400 max-w-2xl mx-auto uppercase tracking-[0.15em]">
            Última actualización: {updated} · {LEGAL_ENTITY.brand}
          </p>
        </div>
      </section>

      <section className="py-10 md:py-16 container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <aside className="lg:col-span-1 lg:sticky lg:top-24 h-fit space-y-6 hidden lg:block">
            <div className="bg-slate-900/50 border border-white/5 rounded-md p-6 backdrop-blur-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 border-b border-white/5 pb-2">
                Índice de contenidos
              </h3>
              <nav className="flex flex-col gap-1.5">
                {sections.map((section, i) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="flex items-center gap-3 text-left py-2 px-3 rounded-md text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-[#00df82]/5 transition-all group cursor-pointer"
                  >
                    <HugeiconsIcon icon={section.icon} className="w-4 h-4 text-slate-500 group-hover:text-[#00df82] transition-colors shrink-0" strokeWidth={1.8} />
                    <span className="truncate">{i + 1}. {section.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-linear-to-br from-[#00df82]/5 to-transparent border border-[#00df82]/10 rounded-md p-6">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#00df82] mb-2">¿Tienes dudas?</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-relaxed">Escríbenos a:</p>
              <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-xs font-black text-white hover:text-[#00df82] transition-colors inline-block mt-3 uppercase tracking-wider">
                {LEGAL_ENTITY.email}
              </a>
            </div>
          </aside>

          <div className="lg:col-span-3 space-y-12 md:space-y-16">
            <div className="text-xs md:text-sm text-slate-400 leading-relaxed space-y-4">{intro}</div>

            {sections.map((section, i) => (
              <div key={section.id} id={section.id} className="scroll-mt-28 space-y-5 border-t border-white/5 pt-8 md:pt-10">
                <div className="flex items-center gap-3 md:gap-4">
                  <HugeiconsIcon icon={section.icon} className="w-7 h-7 md:w-8 md:h-8 text-[#00df82] shrink-0" strokeWidth={1.8} />
                  <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight text-white font-heading">
                    {i + 1}. {section.name}
                  </h2>
                </div>
                <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">{section.content}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer onRegisterClick={() => setIsRegisterOpen(true)} />
      <ScrollToTop />
      <RegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </main>
  );
}

export function Card({ title, children, tone = "default" }: { title?: string; children: ReactNode; tone?: "default" | "warn" | "danger" | "ok" }) {
  const tones = {
    default: "bg-slate-900/40 border-white/5",
    warn: "bg-amber-950/20 border-amber-900/30",
    danger: "bg-red-950/20 border-red-900/30",
    ok: "bg-[#00df82]/5 border-[#00df82]/20",
  };
  const titleTones = { default: "text-white", warn: "text-amber-400", danger: "text-red-400", ok: "text-[#00df82]" };
  return (
    <div className={`p-4 md:p-5 border rounded-md ${tones[tone]}`}>
      {title && <h4 className={`font-bold uppercase tracking-wider text-xs mb-2 ${titleTones[tone]}`}>{title}</h4>}
      <div className="text-slate-400 text-xs md:text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#00df82] shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
