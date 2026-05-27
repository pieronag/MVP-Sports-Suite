"use client";
import Image from "next/image";

export default function AppShowcase() {
  return (
    <section id="app" className="py-20 lg:py-32 relative overflow-hidden bg-slate-950 group/section">
      {/* Fondo Decorativo con Imagen Generada */}
      <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden">
        <Image
          src="/app-bg.png"
          alt="Background"
          fill
          className="object-cover transition-transform duration-[10s] group-hover/section:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      <div className="container relative z-10 px-6">
        <div className="w-full bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] lg:rounded-[3.5rem] p-8 lg:p-16 relative overflow-hidden group shadow-2xl">
          {/* Luces de acento */}
          <div className="absolute top-0 right-0 w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-[#00df82]/10 blur-[80px] lg:blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10 h-full">
            {/* MOCKUP 3D REALISTA (Visible en todos los dispositivos) */}
            <div className="flex justify-center perspective-2000 order-1 lg:order-1">
              <div className="relative transform transition-all duration-1000 group-hover:rotate-y-12 lg:group-hover:rotate-y-20 scale-[0.75] sm:scale-[0.85] lg:scale-100">
                <div className="absolute -inset-4 bg-[#00df82]/20 blur-[60px] rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                <div className="relative w-[300px] sm:w-[320px] h-[650px] sm:h-[700px] bg-[#0b0f1a] rounded-[3rem] border-[8px] border-slate-800 shadow-[20px_40px_80px_rgba(0,0,0,0.8)] overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl z-50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-slate-950 ml-auto mr-4" />
                  </div>

                  <div className="absolute top-0 inset-x-0 h-10 z-40 flex items-center justify-between px-8 text-white font-bold text-[10px] pointer-events-none">
                    <span>21:35</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-2.5 border border-white/50 rounded-[3px] p-[1px] relative">
                        <div className="h-full w-4 bg-white rounded-[1px]" />
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1 bg-white/50 rounded-r-full" />
                      </div>
                    </div>
                  </div>

                  <div className="relative w-full h-full">
                    <Image
                      src="/app-screenshot.jpg?v=1"
                      alt="MVP Sports App"
                      fill
                      className="object-cover object-top"
                      priority
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-20" />
                </div>
              </div>
            </div>

            <div className="space-y-8 flex flex-col justify-center order-2 lg:order-2 text-center lg:text-left">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00df82]/10 border border-[#00df82]/20 mx-auto lg:mx-0">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#00df82] animate-pulse" />
                  <span className="text-[10px] font-black text-[#00df82] uppercase tracking-[0.2em]">Aplicación Oficial</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter font-heading uppercase">
                  TU CANCHA <br />
                  <span className="text-gradient">EN TU BOLSILLO.</span>
                </h2>

                <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Hemos condensado toda la potencia de nuestra plataforma en una aplicación móvil intuitiva. Gestiona tus reservas en segundos y ten tu código QR siempre a mano para ingresar a los recintos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto lg:mx-0">
                {/* App Store Button */}
                <a href="#" className="flex-1 flex items-center gap-3 px-6 py-3 bg-black border border-white/20 rounded-2xl hover:bg-white/10 transition-all duration-300 group/btn">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.24-1.99 1.1-3.15-1.09.04-2.41.72-3.19 1.63-.7.8-1.32 1.96-1.14 3.08 1.22.1 2.48-.7 3.23-1.56z" />
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">Próximamente en</span>
                    <span className="text-base font-bold text-white leading-none">App Store</span>
                  </div>
                </a>

                {/* Play Store Button */}
                <a href="#" className="flex-1 flex items-center gap-3 px-6 py-3 bg-black border border-white/20 rounded-2xl hover:bg-white/10 transition-all duration-300 group/btn">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path d="M21.574 11.234L18.154 9.264L15.114 12.304L18.154 15.344L21.574 13.374C22.144 13.044 22.144 12.164 21.574 11.834V11.234Z" fill="#FBBC04" />
                    <path d="M3.22393 2.15405L14.2239 13.154L17.2739 10.104L4.17393 2.58405C3.76393 2.34405 3.26393 2.47405 3.02393 2.88405C3.00393 2.91405 2.99393 2.95405 2.98393 2.98405L3.22393 2.15405Z" fill="#34A853" />
                    <path d="M2.98393 2.98404L2.43393 3.53404V20.474C2.43393 21.024 2.88393 21.474 3.43393 21.474C3.51393 21.474 3.58393 21.464 3.65393 21.444L14.2239 13.154L3.22393 2.15404L2.98393 2.98404Z" fill="#4285F4" />
                    <path d="M3.65393 21.444L17.2739 13.624L14.2239 10.574L3.22393 21.574C3.29393 21.584 3.36393 21.594 3.43393 21.594C3.60393 21.594 3.77393 21.544 3.92393 21.464L3.65393 21.444Z" fill="#EA4335" />
                  </svg>
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wider">Próximamente en</span>
                    <span className="text-base font-bold text-white leading-none">Google Play</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

