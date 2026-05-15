"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Hero({ onRegisterClick }: { onRegisterClick: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen lg:h-[90vh] lg:max-h-[1000px] lg:min-h-[700px] flex items-center justify-center overflow-hidden pt-32 lg:pt-12 pb-20 lg:pb-12">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 glow-mesh opacity-30" />

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {mounted && [...Array(10)].map((_, i) => (
          <div 
            key={i} 
            className={`particle animate-particle-${(i % 5) + 1}`} 
            style={{ 
              left: `${Math.random() * 100}%`, 
              animationDelay: `${Math.random() * 10}s`, 
              opacity: Math.random() * 0.5 
            }} 
          />
        ))}
      </div>

      <div className="container relative z-10 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#00df82]/10 border border-[#00df82]/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
              <span className="text-[8px] font-black tracking-[0.4em] text-[#00df82] uppercase">Temporada 2026 • En Vivo</span>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter text-sharp font-heading animate-in fade-in slide-in-from-left-10 duration-1000 stagger-1 uppercase">
                EL ADN DEL <br />
                <span className="text-gradient">DEPORTE.</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed animate-in fade-in slide-in-from-left-10 duration-1000 stagger-2">
                Trasciende los límites del campo y profesionaliza tu pasión. La plataforma definitiva para deportistas de élite que buscan la excelencia y gloria en cada partido. Registra tus estadísticas, sube de nivel y domina la liga.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-10 duration-1000 stagger-3">
              <button
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-10 py-5 bg-[#00df82] text-slate-950 font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(0,223,130,0.3)] uppercase tracking-[0.2em] text-[10px]"
              >
                Crear Mi Perfil
              </button>
              <Link
                href="#owners"
                className="w-full sm:w-auto px-10 py-5 bg-white/5 text-white font-black rounded-2xl border border-white/10 hover:bg-white/10 transition-all uppercase tracking-[0.2em] text-[10px] backdrop-blur-xl"
              >
                Ver Ecosistema
              </Link>
            </div>
          </div>

          {/* RIGHT SIDE: PARTICLE BALL EXPERIENCE (OPTIMIZED FOR MOBILE) */}
          <div className="relative flex justify-center items-center h-[300px] sm:h-[400px] lg:h-auto animate-in fade-in zoom-in duration-1000 stagger-2">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96">
              {/* Multiple Concentric Glowing Rings */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00df82]/30 to-blue-500/10 rounded-full blur-[60px] lg:blur-[80px] animate-pulse" />
              
              <div className="absolute inset-0 border-2 border-[#00df82]/20 rounded-full animate-[spin_8s_linear_infinite]" />
              <div className="absolute inset-4 border border-[#00df82]/10 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
              <div className="absolute inset-10 border border-white/5 rounded-full animate-[spin_12s_linear_infinite]" />
              
              {/* Inner Core */}
              <div className="absolute inset-[30%] bg-[#00df82]/30 rounded-full blur-2xl animate-pulse" />
              
              {/* Central Logo Core */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-full bg-slate-900/80 backdrop-blur-3xl border border-white/20 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/Logo.png"
                    alt="MVP Logo"
                    width={100}
                    height={100}
                    className="w-full h-full object-cover object-center scale-[1.1] animate-pulse"
                  />
                </div>
              </div>

              {/* Orbiting Particles */}
              {mounted && [...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-[#00df82] rounded-full shadow-[0_0_8px_#00df82]"
                  style={{
                    transform: `rotate(${i * 30}deg) translateX(${70 + (i % 2 * 20)}px)`,
                    opacity: 0.5 + (Math.random() * 0.5),
                    animation: `spin ${3 + (i % 3)}s linear infinite`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


