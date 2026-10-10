"use client";
import Link from "next/link";
import BrandLogo from "../BrandLogo";

interface FooterProps {
  onRegisterClick?: () => void;
}

const productLinks = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#player-functions", label: "Jugadores" },
  { href: "#owners", label: "Recintos" },
  { href: "#planes", label: "Planes" },
];

const supportLinks = [
  { href: "/login", label: "Ingresar" },
  { href: "https://wa.me/56950194398", label: "Contacto", external: true },
  { href: "/privacy", label: "Privacidad" },
  { href: "/terms", label: "Términos" },
];

export default function Footer({ onRegisterClick }: FooterProps) {
  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 lg:gap-8">
          {/* Brand */}
          <div className="md:col-span-5 flex flex-col items-center text-center gap-3 md:block md:text-left md:space-y-5">
          <Link href="/" aria-label="MVP Sports, ir al inicio" className="inline-flex items-center">
            <BrandLogo size={40} wordmarkClassName="text-lg md:text-xl" />
          </Link>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-xs md:max-w-sm">
              La plataforma para reservar canchas y gestionar complejos deportivos en Chile.
              Reserva, paga y juega desde un solo lugar.
            </p>
            <button
              type="button"
              onClick={onRegisterClick}
              className="hidden md:inline-flex items-center justify-center px-4 md:px-6 py-2.5 md:py-3 text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] md:tracking-[0.18em] text-slate-950 bg-[#00df82] rounded-md hover:bg-[#3affa0] transition-all shadow-[0_0_30px_rgba(0,223,130,0.25)] active:scale-95 cursor-pointer"
            >
              Crear cuenta gratis
            </button>
          </div>

          {/* Producto */}
          <div className="hidden md:block md:col-span-3 space-y-3 md:space-y-4">
            <h4 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-slate-500">
              Producto
            </h4>
            <ul className="space-y-2 md:space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs md:text-sm font-semibold text-slate-400 hover:text-[#00df82] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Soporte / Legal */}
          <div className="md:col-span-4 space-y-3 md:space-y-4">
            <h4 className="hidden md:block text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-slate-500">
              Soporte
            </h4>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 md:block md:space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-xs md:text-sm font-semibold text-slate-400 hover:text-[#00df82] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 md:mt-12 pt-5 md:pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-1.5 md:gap-4 text-center md:text-left">
          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-500">
            © 2026 MVP Sports Suite · Todos los derechos reservados
          </p>
          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-slate-600">
            Hecho en Chile
          </p>
        </div>
      </div>
    </footer>
  );
}
