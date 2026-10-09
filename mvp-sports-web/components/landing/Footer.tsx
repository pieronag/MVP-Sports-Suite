"use client";
import Link from "next/link";
import BrandLogo from "../BrandLogo";

interface FooterProps {
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
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

export default function Footer({ onTermsClick, onPrivacyClick, onRegisterClick }: FooterProps) {
  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="md:col-span-5 space-y-5">
          <Link href="/" aria-label="MVP Sports, ir al inicio" className="inline-flex items-center">
            <BrandLogo size={44} wordmarkClassName="text-xl" />
          </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              La plataforma para reservar canchas y gestionar complejos deportivos en Chile.
              Reserva, paga y juega desde un solo lugar.
            </p>
            <button
              type="button"
              onClick={onRegisterClick}
              className="inline-flex items-center px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 bg-[#00df82] rounded-md hover:bg-[#3affa0] transition-all shadow-[0_0_30px_rgba(0,223,130,0.25)] active:scale-95 cursor-pointer"
            >
              Crear cuenta gratis
            </button>
          </div>

          {/* Producto */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
              Producto
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-semibold text-slate-400 hover:text-[#00df82] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Soporte / Legal */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500">
              Soporte
            </h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    onClick={(e) => {
                      if (link.href === "/terms" && onTermsClick) {
                        e.preventDefault();
                        onTermsClick();
                      } else if (link.href === "/privacy" && onPrivacyClick) {
                        e.preventDefault();
                        onPrivacyClick();
                      }
                    }}
                    className="text-sm font-semibold text-slate-400 hover:text-[#00df82] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            © 2026 MVP Sports Suite · Todos los derechos reservados
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">
            Hecho en Chile
          </p>
        </div>
      </div>
    </footer>
  );
}
