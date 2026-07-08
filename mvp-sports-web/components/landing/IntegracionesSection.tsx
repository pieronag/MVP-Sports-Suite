"use client";

export default function IntegracionesSection() {
  return (
    <section className="py-16 relative overflow-hidden border-t border-white/5">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-10 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-[#00df82] uppercase tracking-[0.4em]">Tecnología en la que confías</p>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">INTEGRACIONES DE PRIMER NIVEL</h3>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-10 lg:gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
             <div className="flex flex-col items-center gap-1">
               <span className="text-base lg:text-lg font-black text-white tracking-tighter">TRANSBANK</span>
               <span className="text-[8px] font-bold text-slate-400">PAGOS SEGUROS</span>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
