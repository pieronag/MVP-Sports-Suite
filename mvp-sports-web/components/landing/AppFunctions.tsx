export default function AppFunctions({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <section id="player-functions" className="py-20 lg:py-32 relative overflow-hidden bg-slate-950/20">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-1/4 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-blue-500/5 blur-[80px] lg:blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
      
      <div className="container relative z-10 px-6">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start lg:items-end mb-16 lg:mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex-[2] space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter font-heading uppercase">
              LA EXPERIENCIA <br />
              <span className="text-gradient">DEL JUGADOR ÉLITE.</span>
            </h2>
          </div>
          <div className="flex-1 lg:pb-2">
            <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed border-l-2 border-blue-500/30 pl-6">
              Hemos diseñado una interfaz maestra para que cada partido sea una experiencia profesional, desde la reserva hasta el tercer tiempo.
            </p>
          </div>
        </div>

        {/* Diseño Bento Grid Jugadores */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 lg:gap-4 lg:auto-rows-[160px]">
          
          {/* Reserva Maestro (Grande) */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-2 group p-8 rounded-[2rem] lg:rounded-[2.5rem] bg-[#00df82]/10 border border-white/5 hover:border-[#00df82]/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,223,130,0.1)] overflow-hidden relative">
            <div className="relative z-10 h-full flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <h4 className="text-[#00df82] font-black text-[10px] uppercase tracking-[0.3em]">Reserva Fácil</h4>
                <p className="text-xl sm:text-2xl font-black text-white leading-tight">Encuentra tu cancha <br/> en pocos segundos.</p>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed text-justify">
                Busca los mejores lugares para jugar cerca de donde estés. Elige el deporte, la hora que prefieras y confirma tu reserva al instante sin complicaciones.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
              <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
          </div>

          {/* Perfil (Grande) */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-2 group p-8 rounded-[2rem] lg:rounded-[2.5rem] bg-blue-500/10 border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)] overflow-hidden relative">
            <div className="relative z-10 h-full flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em]">Tu Perfil</h4>
                <p className="text-xl sm:text-2xl font-black text-white leading-tight">Toda tu carrera <br/> deportiva en un lugar.</p>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed text-justify">
                Sube de nivel con cada partido que juegues, gana reconocimientos por tu desempeño y usa tu código personal para entrar rápido al recinto.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
              <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6"/></svg>
            </div>
          </div>

          {/* Pagos */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-1 group p-8 rounded-[2rem] bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Pagos Digitales</h4>
              <p className="text-lg font-bold text-white mb-2">Paga sin efectivo.</p>
              <p className="text-xs text-slate-500 leading-tight">Carga dinero en tu cuenta, paga tus reservas directamente y divide los gastos con tus amigos de forma simple.</p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="md:col-span-3 lg:col-span-4 lg:row-span-1 group p-8 rounded-[2rem] bg-orange-500/10 border border-white/5 hover:border-orange-500/30 transition-all duration-500 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-orange-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Tus Estadísticas</h4>
              <p className="text-lg font-bold text-white mb-2">Mide tu nivel.</p>
              <p className="text-xs text-slate-500 leading-tight">Mira cómo mejora tu juego con gráficos detallados y conoce tu nivel competitivo actualizado después de cada encuentro.</p>
            </div>
          </div>

          {/* Equipos */}
          <div className="md:col-span-2 lg:col-span-3 lg:row-span-1 group p-8 rounded-[2rem] bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 flex flex-col justify-between gap-4">
            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em]">Crea tu Equipo</h4>
            <p className="text-xs text-slate-400 leading-tight">Arma tu grupo de amigos, busca nuevos jugadores y compite contra otros equipos de tu ciudad.</p>
          </div>

          {/* Mapa */}
          <div className="md:col-span-2 lg:col-span-3 lg:row-span-1 group p-8 rounded-[2rem] bg-sky-500/10 border border-white/5 hover:border-sky-500/30 transition-all duration-500 flex flex-col justify-between gap-4">
            <h4 className="text-sky-400 font-black text-[10px] uppercase tracking-[0.3em]">Mapa de Canchas</h4>
            <p className="text-xs text-slate-400 leading-tight">Encuentra todos los complejos deportivos en el mapa, mira fotos reales y conoce cómo llegar fácilmente.</p>
          </div>

          {/* Historial */}
          <div className="md:col-span-2 lg:col-span-3 lg:row-span-1 group p-8 rounded-[2rem] bg-purple-500/10 border border-white/5 hover:border-purple-500/30 transition-all duration-500 flex flex-col justify-between gap-4">
            <h4 className="text-purple-400 font-black text-[10px] uppercase tracking-[0.3em]">Tus Partidos</h4>
            <p className="text-xs text-slate-400 leading-tight">Revisa tus reservas confirmadas, mira tus resultados pasados y califica la calidad del recinto donde jugaste.</p>
          </div>

          {/* CTA CARD JUGADORES */}
          <div className="md:col-span-2 lg:col-span-3 lg:row-span-1 group p-8 rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 border border-white/20 hover:scale-[1.02] active:scale-95 transition-all duration-500 flex flex-col justify-center gap-5 cursor-pointer shadow-[0_0_50px_rgba(37,99,235,0.3)] relative overflow-hidden"
               onClick={onRegisterClick}>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl animate-pulse pointer-events-none" />
            
            <div className="relative z-10">
              <h4 className="text-white/80 font-black text-[9px] uppercase tracking-[0.3em] mb-1">Únete a la comunidad</h4>
              <p className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Regístrate Gratis</p>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
               <div className="space-y-1">
                 <p className="text-[9px] text-white font-black uppercase tracking-widest leading-none">Empieza hoy mismo</p>
                 <div className="h-0.5 w-8 bg-white/40 rounded-full" />
               </div>
               <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-blue-600 group-hover:rotate-[360deg] transition-transform duration-700 shadow-xl">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
               </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

