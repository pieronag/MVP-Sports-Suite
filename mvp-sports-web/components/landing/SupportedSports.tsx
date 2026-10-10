import React from "react";
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from "../icons/SportsIcons";
import SectionHeading from "./SectionHeading";

const sports = [
  { name: "Fútbol", icon: SoccerIcon, accent: "text-emerald-400", glow: "hover:shadow-[0_0_30px_-8px_rgba(16,185,129,0.5)]", ring: "border-emerald-500/20" },
  { name: "Futbolito", icon: SoccerIcon, accent: "text-lime-400", glow: "hover:shadow-[0_0_30px_-8px_rgba(132,204,22,0.5)]", ring: "border-lime-500/20" },
  { name: "Pádel", icon: PadelIcon, accent: "text-blue-400", glow: "hover:shadow-[0_0_30px_-8px_rgba(59,130,246,0.5)]", ring: "border-blue-500/20" },
  { name: "Tenis", icon: TennisIcon, accent: "text-amber-400", glow: "hover:shadow-[0_0_30px_-8px_rgba(245,158,11,0.5)]", ring: "border-amber-500/20" },
  { name: "Básquetbol", icon: BasketballIcon, accent: "text-orange-400", glow: "hover:shadow-[0_0_30px_-8px_rgba(249,115,22,0.5)]", ring: "border-orange-500/20" },
  { name: "Vóleibol", icon: VolleyballIcon, accent: "text-purple-400", glow: "hover:shadow-[0_0_30px_-8px_rgba(168,85,247,0.5)]", ring: "border-purple-500/20" },
];

export default function SupportedSports() {
  return (
    <section className="py-16 md:py-24 lg:py-28 relative z-10 border-y border-slate-800/50 bg-slate-900/30">
      <div className="container mx-auto px-4 md:px-6">
        <SectionHeading
          align="center"
          eyebrow="Ecosistema deportivo"
          title={
            <>
              UN DEPORTE, <span className="text-gradient">UNA PLATAFORMA.</span>
            </>
          }
          description="Gestionamos la complejidad táctica y operativa de cada disciplina para que tú solo te preocupes de jugar."
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {sports.map((sport) => {
            const Icon = sport.icon;
            return (
              <div
                key={sport.name}
                className={`group flex flex-col items-center justify-center gap-4 p-6 rounded-md bg-slate-900/50 border ${sport.ring} hover:border-white/20 transition-all duration-300 hover:-translate-y-1.5 ${sport.glow}`}
              >
                <Icon className={`w-12 h-12 ${sport.accent} transition-transform duration-300 group-hover:scale-110`} />
                <span className="text-slate-300 font-black text-xs sm:text-sm tracking-wider uppercase group-hover:text-white transition-colors text-center">
                  {sport.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
