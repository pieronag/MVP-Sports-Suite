"use client";

export default function AdminPreview({ onRegisterClick }: { onRegisterClick: () => void }) {
  return (
    <section id="owners" className="py-32 relative overflow-hidden bg-slate-950/40">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#00df82]/5 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
      
      <div className="container relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-end mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="flex-[2] space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter font-heading uppercase">
              ADMINISTRA TU <br />
              <span className="text-gradient">COMPLEJO DEPORTIVO.</span>
            </h2>
          </div>
          <div className="flex-1 lg:pb-2">
            <p className="text-base text-slate-400 font-medium leading-relaxed border-l-2 border-[#00df82]/30 pl-6">
              Panel de control completo para gestionar reservas, cobros online con Transbank, personal y métricas de tu negocio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 auto-rows-[160px]">
          {/* Centro de Finanzas (Grande) */}
          <div className="md:col-span-3 lg:col-span-4 row-span-2 group p-8 rounded-[2.5rem] bg-blue-500/10 border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(59,130,246,0.1)] overflow-hidden relative">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-blue-400 font-black text-sm uppercase tracking-widest">Centro de Finanzas</h3>
                <p className="text-xl lg:text-2xl font-black text-white leading-tight">Ingresos y ocupación <br/> en tiempo real.</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed text-justify">
                Dashboard financiero con ingresos diarios, ocupación de canchas, ticket promedio y montos por cobrar. Todo integrado con pagos online vía Transbank.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
          </div>

          {/* Calendario Maestro (Grande) */}
          <div className="md:col-span-3 lg:col-span-4 row-span-2 group p-8 rounded-[2.5rem] bg-[#00df82]/10 border border-white/5 hover:border-[#00df82]/30 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,223,130,0.1)] overflow-hidden relative">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-[#00df82] font-black text-sm uppercase tracking-widest">Calendario de Canchas</h3>
                <p className="text-xl lg:text-2xl font-black text-white leading-tight">Gestión de horarios <br/> sin dobles reservas.</p>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed text-justify">
                Calendario visual con disponibilidad por cancha, filtros por deporte, bloqueo por mantenimiento y control total para evitar sobre-reservas.
              </p>
            </div>
            <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <svg className="w-40 h-40 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
          </div>

          {/* Gestor de Torneos */}
          <div className="md:col-span-3 lg:col-span-4 row-span-1 group p-6 rounded-[2rem] bg-orange-500/10 border border-white/5 hover:border-orange-500/30 transition-all duration-500 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-orange-400 font-black text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                Torneos
                <span className="text-[9px] bg-orange-500/20 px-2 py-0.5 rounded-full font-bold">Próximamente</span>
              </h3>
              <p className="text-lg font-bold text-white mb-2">Ligas y campeonatos.</p>
              <p className="text-xs text-slate-400 leading-tight">Creación de torneos con fases de grupos y eliminación directa. Tabla de posiciones, fixture automático e inscripción de equipos.</p>
            </div>
          </div>

          {/* Academia Deportiva */}
          <div className="md:col-span-3 lg:col-span-4 row-span-1 group p-6 rounded-[2rem] bg-sky-500/10 border border-white/5 hover:border-sky-500/30 transition-all duration-500 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-sky-400 font-black text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                Academia
                <span className="text-[9px] bg-sky-500/20 px-2 py-0.5 rounded-full font-bold">Próximamente</span>
              </h3>
              <p className="text-lg font-bold text-white mb-2">Clases y alumnos.</p>
              <p className="text-xs text-slate-400 leading-tight">Administración de escuelas deportivas: horarios de clases, lista de alumnos, control de asistencias y asignación de profesores.</p>
            </div>
          </div>

          {/* Cards inferiores más compactas */}
          <div className="md:col-span-2 lg:col-span-3 row-span-1 group p-6 rounded-[2rem] bg-purple-500/10 border border-white/5 hover:border-purple-500/30 transition-all duration-500 flex flex-col justify-between">
            <h3 className="text-purple-400 font-black text-xs uppercase tracking-widest mb-2">Gestión de Canchas</h3>
            <p className="text-xs text-slate-400 leading-tight">Configura el tipo de superficie, iluminación, precio por hora y horarios de cada cancha. Agrega fotos y deportes disponibles.</p>
          </div>

          <div className="md:col-span-2 lg:col-span-3 row-span-1 group p-6 rounded-[2rem] bg-pink-500/10 border border-white/5 hover:border-pink-500/30 transition-all duration-500 flex flex-col justify-between">
            <h3 className="text-pink-400 font-black text-xs uppercase tracking-widest mb-2">Cupones y Descuentos</h3>
            <p className="text-xs text-slate-400 leading-tight">Crea códigos promocionales con descuentos porcentuales, límites de uso y fechas de vigencia para atraer más jugadores.</p>
          </div>

          <div className="md:col-span-2 lg:col-span-3 row-span-1 group p-6 rounded-[2rem] bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all duration-500 flex flex-col justify-between">
            <h3 className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-2">Roles y Personal</h3>
            <p className="text-xs text-slate-400 leading-tight">Asigna roles a tu equipo: administradores, staff y supervisores, cada uno con permisos diferenciados dentro del panel.</p>
          </div>

          {/* CTA CARD - WHATSAPP CONTACT */}
          <a href="https://wa.me/56950194398?text=Hola,%20me%20interesa%20profesionalizar%20mi%20recinto%20deportivo%20con%20MVP%20Sports." 
             target="_blank" 
             rel="noopener noreferrer"
             className="md:col-span-2 lg:col-span-3 row-span-1 group p-6 rounded-[2rem] bg-gradient-to-br from-[#00df82] via-emerald-500 to-teal-500 border border-[#00df82]/30 hover:scale-[1.05] transition-all duration-500 flex flex-col justify-between cursor-pointer shadow-[0_0_50px_rgba(0,223,130,0.3)] relative overflow-hidden active:scale-95">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl animate-pulse pointer-events-none" />
            
            <div className="relative z-10 space-y-1">
              <h3 className="text-slate-900 font-black text-[9px] uppercase tracking-[0.2em] opacity-80">Asesoría Personalizada</h3>
              <p className="text-xl lg:text-2xl font-black text-slate-950 uppercase tracking-tighter leading-tight">Habla con <br/> un experto</p>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
               <p className="text-[10px] text-slate-900 font-black uppercase tracking-widest">Respuesta Inmediata</p>
               <div className="w-12 h-12 flex items-center justify-center text-slate-950 group-hover:rotate-[360deg] transition-transform duration-700">
                 <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                 </svg>
               </div>
            </div>
          </a>

        </div>

      </div>
    </section>
  );
}
