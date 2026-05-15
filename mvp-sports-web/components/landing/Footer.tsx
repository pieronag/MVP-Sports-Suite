"use client";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 py-16 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center gap-10 text-center">
          
          {/* LOGO + NAME (Same as Navbar) */}
          <div className="flex items-center gap-4">
            <Link href="/" className="relative w-12 h-12 group cursor-pointer overflow-hidden rounded-xl border border-white/5">
              <div className="absolute inset-0 bg-[#00df82] blur-md opacity-0 group-hover:opacity-40 transition-opacity" />
              <Image 
                src="/Logo.png" 
                alt="MVP Sports Logo" 
                width={48} 
                height={48} 
                className="relative z-10 w-full h-full object-cover scale-[1.4] transition-transform duration-500 group-hover:scale-[1.5]" 
              />
            </Link>
            <span className="text-xl font-black text-white tracking-tighter uppercase font-heading">MVP SPORTS</span>
          </div>

          <div className="space-y-4">
            {/* DERECHOS RESERVADOS */}
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-500">
              © 2026 MVP Sports Suite. Todos los derechos reservados.
            </p>

            {/* TERMINOS Y CONDICIONES */}
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-600">
              <Link href="/terms" className="hover:text-[#00df82] transition-colors">Términos y Condiciones</Link>
              <Link href="/privacy" className="hover:text-[#00df82] transition-colors">Política de Privacidad</Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
