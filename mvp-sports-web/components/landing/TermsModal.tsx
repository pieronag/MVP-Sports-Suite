"use client";

import { useEffect } from "react";
import { 
  XMarkIcon,
  ShieldCheckIcon,
  ScaleIcon,
  UserMinusIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  // Bloquear el scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
      {/* BACKDROP */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* CONTAINER */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#00df82] bg-[#00df82]/10 px-2.5 py-1 rounded-md border border-[#00df82]/20">
              Contrato Legal
            </span>
            <h2 className="text-sm md:text-base font-black uppercase tracking-[0.2em] text-white">
              Términos y Condiciones de Uso
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Cerrar modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin scrollbar-thumb-white/10 text-xs md:text-sm text-slate-400 leading-relaxed">
          
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
              <ShieldCheckIcon className="w-5 h-5 text-[#00df82]" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                1. Definiciones y Roles en el Ecosistema
              </h3>
            </div>
            <p>
              Para efectos de una correcta interpretación, se definen los siguientes roles dentro de la plataforma:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-[11px]">
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">SuperAdmin (MVP Sports Chile)</span>
                Propietario y operador del software, encargado de la mantención del código, soporte global y facturación SaaS.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Dueño de Recinto (Owner)</span>
                Persona natural o jurídica que contrata el servicio SaaS de MVP Sports Suite para gestionar complejos deportivos.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Mánager / Staff</span>
                Personal designado por el Recinto para la administración diaria en sitio (check-in, cobro local).
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-[#00df82] uppercase tracking-wider block mb-1">Jugador (Player)</span>
                Persona registrada en la app móvil que busca recintos, realiza reservas y visualiza su nivel ELO/XP.
              </div>
            </div>
          </div>

          {/* 2. MODELO SAAS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <ScaleIcon className="w-5 h-5 text-cyan-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                2. Relación Contractual y Modelo SaaS (Recintos)
              </h3>
            </div>
            <p>
              El acceso de los Recintos al Dashboard está sujeto a planes de suscripción (Free, Básico, Pro, Elite) que limitan las funcionalidades habilitadas. Las reservas en línea procesadas a través de la pasarela de pagos oficial devengan una comisión del 5% al 8% según el plan contratado.
            </p>
          </div>

          {/* 3. REGISTRO Y CUENTAS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <UserMinusIcon className="w-5 h-5 text-purple-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                3. Registro de Cuenta e Identidad Deportiva
              </h3>
            </div>
            <p>
              La cuenta móvil de Jugador se asocia a una tarjeta digital (**MVP Card**) con un sistema de gamificación basado en XP y rango competitivo (ELO).
            </p>
            <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-xl">
              <span className="font-bold text-red-400 uppercase tracking-wider text-[11px] block mb-1">
                Baja de cuenta y anonimización de reservas
              </span>
              Si decides dar de baja tu cuenta desde la app móvil, tus credenciales de Firebase Auth y documento de perfil se eliminarán permanentemente. No obstante, por auditoría fiscal y balances contables del recinto, el historial de reservas asociadas se conservará de forma 100% anonimizada.
            </div>
          </div>

          {/* 4. RESERVAS Y PAGOS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <CalendarDaysIcon className="w-5 h-5 text-blue-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                4. Proceso de Reservas y Canales de Pago
              </h3>
            </div>
            <p>
              Las reservas se efectúan mediante un flujo progresivo de 3 pasos (Deporte, Cancha, Fecha/Hora). Admitimos dos modalidades de pago:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Pago Online:</strong> A través de Transbank Webpay Plus integrado en un WebView móvil seguro. No almacenamos datos de tarjetas físicas en base de datos.</li>
              <li><strong>Pago en Recinto:</strong> Selección presencial ante el administrador si no hay pasarela en línea activa.</li>
            </ul>
          </div>

          {/* 5. CANCELACIONES Y REEMBOLSOS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <CreditCardIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                5. Políticas de Cancelación y Reembolso
              </h3>
            </div>
            <p>
              Las reservas pagadas de forma online están regidas por las siguientes ventanas temporales:
            </p>
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-3 text-[11px]">
              <div className="flex justify-between border-b border-white/5 pb-2.5">
                <div>
                  <span className="font-bold text-white block">Cancelaciones con más de 4 horas de anticipación:</span>
                  Reembolso del dinero descontando un 3% por gastos de comisión y procesamiento de Transbank + IVA.
                </div>
                <span className="text-[#00df82] font-black flex-shrink-0 ml-4">97% Reembolsado</span>
              </div>
              <div className="flex justify-between pt-1">
                <div>
                  <span className="font-bold text-white block">Cancelaciones con menos de 4 horas o Check-In activo:</span>
                  El dinero se retiene de forma íntegra en favor del recinto deportivo por concepto de reserva bloqueada tardía.
                </div>
                <span className="text-red-500 font-black flex-shrink-0 ml-4">0% Reembolsado</span>
              </div>
            </div>
            <div className="p-4 bg-amber-950/10 border border-amber-900/20 rounded-xl">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] block mb-1">
                Falla en pasarela Transbank
              </span>
              Si la devolución automática por API falla, el sistema liberará la cancha y creará un estado `refund_failed`. La app del jugador generará un comprobante digital único con formato `MVP-REFUND-[ID_RESERVA_8]`. El jugador deberá presentarlo al recinto para que la administración ejecute la devolución de forma manual (transferencia).
            </div>
          </div>

          {/* 6. NO-SHOW */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                6. Reglas de Control de Asistencia (No-Show)
              </h3>
            </div>
            <p>
              Toda reserva que llegue a su hora de inicio programada y no registre asistencia física validada en el sistema (check-in no realizado por QR o manual) se considerará de forma automática como **Inasistencia (No-Show)**:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Si estaba pagada online, el pago se marca de manera definitiva como <strong>Pago Retenido</strong> (sin opción de reembolso o reprogramación).</li>
              <li>Si era de pago presencial, se cancelará liberando la cancha y restará puntos de confiabilidad de reservas futuras del jugador.</li>
            </ul>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-white/5 bg-slate-900/40 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            © 2026 MVP Sports Chile • Todos los derechos reservados.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 bg-[#00df82] rounded-xl hover:bg-[#00c975] transition-all hover:scale-105"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
