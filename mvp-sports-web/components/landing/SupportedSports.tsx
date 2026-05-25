import React from 'react';
import { SoccerIcon, PadelIcon, TennisIcon, BasketballIcon, VolleyballIcon } from '../icons/SportsIcons';

const sports = [
  { name: 'Fútbol', icon: SoccerIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { name: 'Futbolito', icon: SoccerIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { name: 'Pádel', icon: PadelIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { name: 'Tenis', icon: TennisIcon, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { name: 'Básquetbol', icon: BasketballIcon, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { name: 'Vóleibol', icon: VolleyballIcon, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
];

export default function SupportedSports() {
  return (
    <section className="py-12 md:py-16 relative z-10 border-y border-slate-800/50 bg-slate-900/30 backdrop-blur-md">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center justify-center text-center space-y-8 md:space-y-10">
          <div className="space-y-2">
            <h3 className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-[#00df82]">
              Ecosistema Deportivo
            </h3>
            <p className="text-slate-400 text-sm md:text-base font-medium max-w-xl mx-auto">
              Nuestra plataforma está optimizada nativamente para gestionar la complejidad táctica y operativa de los siguientes deportes.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
            {sports.map((sport, i) => {
              const Icon = sport.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-4 group cursor-default">
                  <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl flex items-center justify-center ${sport.bg} ${sport.color} border ${sport.border} transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2 shadow-lg shadow-black/20 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]`}>
                    <Icon className="w-8 h-8 md:w-12 md:h-12" />
                  </div>
                  <span className="text-slate-300 font-bold text-sm md:text-base tracking-wider uppercase group-hover:text-white transition-colors">
                    {sport.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
