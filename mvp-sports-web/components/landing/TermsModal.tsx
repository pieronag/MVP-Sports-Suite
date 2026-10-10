"use client";

import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  SecurityCheckIcon,
  ScaleIcon,
  UserMinus01Icon,
  Calendar03Icon,
  CreditCardIcon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("overflow-hidden");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200"
      role="presentation"
    >
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* CONTAINER */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        className="relative z-10 w-full max-w-4xl bg-slate-900/70 border border-white/10 rounded-md shadow-[0_0_120px_-25px_rgba(0,223,130,0.35)] flex flex-col max-h-[85vh] overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200"
      >
        {/* grid + glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[240px] bg-[#00df82]/12 blur-[120px] rounded-full" />

        {/* HEADER */}
        <div className="relative z-10 flex items-start justify-between gap-4 px-6 py-5 border-b border-white/5">
          <div className="min-w-0">
            <span className="text-[11px] font-black text-[#00df82] uppercase tracking-[0.3em]">
              Contrato legal
            </span>
            <h2 id="terms-title" className="text-lg md:text-xl font-black text-white font-heading uppercase tracking-tighter mt-1 truncate">
              Términos y Condiciones
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar términos y condiciones"
            className="p-2 -mt-1 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer shrink-0 rounded-md"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar text-xs md:text-sm text-slate-400 leading-relaxed">

          {/* INTRO */}
          <div className="space-y-3">
            <p className="text-slate-300 font-medium">
              Bienvenido a <strong>MVP Sports Suite</strong>, una plataforma integral de gestión deportiva digital y reserva de recintos, operada bajo la modalidad Software as a Service (SaaS) Multi-Tenant.
            </p>
            <p>
              Al registrarse, acceder o utilizar cualquier parte de la plataforma, usted acepta de manera expresa y sin reservas estar sujeto a estos Términos. Si no está de acuerdo con alguna de las disposiciones aquí establecidas, no deberá utilizar la plataforma.
            </p>
          </div>

          {/* 1. ROLES Y DEFINICIONES */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5 text-[#00df82]" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                1. Definiciones y Roles en el Ecosistema
              </h3>
            </div>
            <p>
              Para efectos de una correcta interpretación, se definen los siguientes roles dentro de la plataforma:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-[11px]">
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">SuperAdmin (MVP Sports Chile)</span>
                Propietario y operador del software, encargado de la mantención del código, soporte global y facturación SaaS.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Dueño de Recinto (Owner)</span>
                Persona natural o jurídica que contrata el servicio SaaS de MVP Sports Suite para gestionar complejos deportivos.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Mánager / Staff</span>
                Personal designado por el Recinto para la administración diaria en sitio (check-in, cobro local).
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-[#00df82] uppercase tracking-wider block mb-1">Jugador (Player)</span>
                Persona registrada en la app móvil que busca recintos, realiza reservas y visualiza su nivel ELO/XP.
              </div>
            </div>
          </div>

          {/* 2. MODELO SAAS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={ScaleIcon} className="w-5 h-5 text-cyan-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                2. Relación Contractual y Modelo SaaS (Recintos)
              </h3>
            </div>
            <p>
              El acceso de los Recintos al Dashboard está sujeto a planes de suscripción (Free, Básico, Pro, Elite) que limitan las funcionalidades habilitadas. Las reservas en línea procesadas a través de la pasarela de pagos oficial devengan una comisión de 0% a 4% según el plan contratado.
            </p>
          </div>

          {/* 3. REGISTRO Y CUENTAS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={UserMinus01Icon} className="w-5 h-5 text-purple-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                3. Registro de Cuenta e Identidad Deportiva
              </h3>
            </div>
            <p>
              La cuenta móvil de Jugador se asocia a una tarjeta digital (<strong>MVP Card</strong>) con un sistema de gamificación basado en XP y rango competitivo (ELO).
            </p>
            <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-md">
              <span className="font-bold text-red-400 uppercase tracking-wider text-[11px] block mb-1">
                Baja de cuenta y anonimización de reservas
              </span>
              Si decides dar de baja tu cuenta desde la app móvil, tus credenciales de Firebase Auth y documento de perfil se eliminarán permanentemente. No obstante, por auditoría fiscal y balances contables del recinto, el historial de reservas asociadas se conservará de forma 100% anonimizada.
            </div>
          </div>

          {/* 4. RESERVAS Y PAGOS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={Calendar03Icon} className="w-5 h-5 text-blue-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                4. Proceso de Reservas y Canales de Pago
              </h3>
            </div>
            <p>
              Las reservas se efectúan mediante un flujo progresivo de 3 pasos (Deporte, Cancha, Fecha/Hora). Admitimos dos modalidades de pago:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Pago Online:</strong> A través de Mercado Pago integrado en un WebView móvil seguro. No almacenamos datos de tarjetas físicas en base de datos.</li>
              <li><strong>Pago en Recinto:</strong> Selección presencial ante el administrador si no hay pasarela en línea activa.</li>
            </ul>
          </div>

          {/* 5. CANCELACIONES Y REEMBOLSOS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={CreditCardIcon} className="w-5 h-5 text-emerald-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                5. Políticas de Cancelación y Reembolso
              </h3>
            </div>
            <p>
              Las reservas pagadas de forma online están regidas por las siguientes ventanas temporales:
            </p>
            <div className="bg-slate-950/40 border border-white/5 rounded-md p-5 space-y-3 text-[11px]">
              <div className="flex justify-between border-b border-white/5 pb-2.5">
                <div>
                  <span className="font-bold text-white block">Cancelaciones con más de 4 horas de anticipación:</span>
                  Reembolso del dinero descontando un 3% por gastos de comisión y procesamiento de Mercado Pago + IVA.
                </div>
                <span className="text-[#00df82] font-black shrink-0 ml-4">97% Reembolsado</span>
              </div>
              <div className="flex justify-between pt-1">
                <div>
                  <span className="font-bold text-white block">Cancelaciones con menos de 4 horas o Check-In activo:</span>
                  El dinero se retiene de forma íntegra en favor del recinto deportivo por concepto de reserva bloqueada tardía.
                </div>
                <span className="text-red-500 font-black shrink-0 ml-4">0% Reembolsado</span>
              </div>
            </div>
            <div className="p-4 bg-amber-950/10 border border-amber-900/20 rounded-md">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] block mb-1">
                Falla en pasarela de pagos
              </span>
              Si la devolución automática por API falla, el sistema liberará la cancha y creará un estado <code className="text-white">refund_failed</code>. La app del jugador generará un comprobante digital único con formato <code className="text-white">MVP-REFUND-[ID_RESERVA_8]</code>. El jugador deberá presentarlo al recinto para que la administración ejecute la devolución de forma manual (transferencia).
            </div>
          </div>

          {/* 6. NO-SHOW */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                6. Reglas de Control de Asistencia (No-Show)
              </h3>
            </div>
            <p>
              Toda reserva que llegue a su hora de inicio programada y no registre asistencia física validada en el sistema (check-in no realizado por QR o manual) se considerará de forma automática como <strong>Inasistencia (No-Show)</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Si estaba pagada online, el pago se marca de manera definitiva como <strong>Pago Retenido</strong> (sin opción de reembolso o reprogramación).</li>
              <li>Si era de pago presencial, se cancelará liberando la cancha y restará puntos de confiabilidad de reservas futuras del jugador.</li>
            </ul>
          </div>

        </div>

        {/* FOOTER */}
        <div className="relative z-10 px-6 py-4 border-t border-white/5 bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            © 2026 MVP Sports Chile · Todos los derechos reservados
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-slate-950 bg-[#00df82] rounded-md hover:bg-[#3affa0] transition-all shadow-[0_0_25px_-8px_rgba(0,223,130,0.6)] active:scale-95 cursor-pointer"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
