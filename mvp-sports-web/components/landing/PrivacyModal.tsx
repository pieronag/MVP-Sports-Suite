"use client";

import { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  File01Icon,
  CpuIcon,
  Share01Icon,
  Delete01Icon,
  SquareLock01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200"
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
        aria-labelledby="privacy-title"
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
              Privacidad
            </span>
            <h2 id="privacy-title" className="text-lg md:text-xl font-black text-white font-heading uppercase tracking-tighter mt-1 truncate">
              Política de Privacidad
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar política de privacidad"
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
              En <strong>MVP Sports Chile</strong> nos tomamos muy en serio la privacidad y seguridad de la información de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos sus datos en cumplimiento con la <strong>Ley N° 19.628 sobre Protección de la Vida Privada</strong> de la República de Chile.
            </p>
          </div>

          {/* 1. DATOS RECOPILADOS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-cyan-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                1. Datos Personales que Recopilamos
              </h3>
            </div>
            <p>
              Recopilamos la información estrictamente necesaria para proveer los servicios de reservas e identidades deportivas:
            </p>
            <div className="space-y-3 mt-2 text-[11px]">
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Información de Registro</span>
                Nombre, correo electrónico y teléfono. Las fotos de perfil se serializan en <strong>Base64 con prefijo MIME</strong>, sincronizándose entre Firestore <code className="text-white">users</code>, <code className="text-white">staff</code> y Firebase Auth, evitando enlaces externos volátiles.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Ubicación (GPS)</span>
                Uso de ubicación en tiempo real del dispositivo del jugador con la única finalidad de <strong>calcular distancias en kilómetros (KM/M)</strong> a recintos deportivos cercanos (Explore Map Hub). No se almacena permanentemente.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Historial y Chat Deportivo</span>
                Historial de reservas, partidos, nivel de puntos XP y rango ELO. Al usar Squads (Equipos) en la app, procesamos los mensajes en el <strong>Chat Interno de Equipo</strong> solo para la coordinación de juegos.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-[#00df82] uppercase tracking-wider block mb-1">Seguridad Financiera</span>
                <strong>No almacenamos números de tarjetas de débito/crédito</strong> en base de datos. Los pagos online se transaccionan de forma externa y segura en la API de <strong>Mercado Pago</strong> dentro de un WebView in-app.
              </div>
            </div>
          </div>

          {/* 2. FINALIDAD DEL USO */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={CpuIcon} className="w-5 h-5 text-purple-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                2. Finalidad del Tratamiento de Datos
              </h3>
            </div>
            <p>
              Tratamos sus datos personales con los siguientes fines operativos y comerciales legítimos:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Coordinación:</strong> Procesar las reservas, check-in por QR de asistencia en sitio, y ocupación.</li>
              <li><strong>Gamificación:</strong> Calcular y desplegar el rendimiento en la MVP Card del jugador.</li>
              <li><strong>Auditoría:</strong> Registrar bitácoras de auditoría de base de datos inmutables (System Audit Log) contra fraudes.</li>
              <li><strong>Facturación SII:</strong> Sincronizar las ventas facturables con el Servicio de Impuestos Internos (SII) de Chile (complejos con plan Elite).</li>
            </ul>
          </div>

          {/* 3. COMPARTIR DATOS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={Share01Icon} className="w-5 h-5 text-blue-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                3. Intercambio de Datos y Terceros
              </h3>
            </div>
            <p>
              No vendemos ni comercializamos tus datos personales. Se transfieren únicamente de forma operativa:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Con recintos deportivos donde reservas (para el ingreso).</li>
              <li>Con Mercado Pago (para cobros y reembolsos automáticos).</li>
              <li>Con infraestructura de base de datos segura de Google Firebase / Google Cloud en Sudamérica.</li>
            </ul>
          </div>

          {/* 4. RETENCION Y BAJA */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={Delete01Icon} className="w-5 h-5 text-red-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                4. Retención de Datos y Anonimización
              </h3>
            </div>
            <p>
              Al eliminar definitivamente tu cuenta desde la app móvil, eliminamos tus credenciales en Firebase Auth y tu perfil en Firestore. Sin embargo, para resguardar la contabilidad de los recintos, <strong>los registros financieros e historial de reservas se conservarán bajo anonimización estricta e irreversible</strong>.
            </p>
          </div>

          {/* 5. MEDIDAS DE SEGURIDAD */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={SquareLock01Icon} className="w-5 h-5 text-emerald-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                5. Resguardo y Medidas de Seguridad
              </h3>
            </div>
            <p>
              Implementamos medidas tecnológicas avanzadas como <strong>Firestore Security Rules</strong> que aíslan el acceso a los datos de cada recinto (Multi-Tenant) y del jugador, y mecanismos de creación diferida de reservas en pasarela para prevenir la retención innecesaria de bloques si no se completa la transacción.
            </p>
          </div>

          {/* 6. DERECHOS ARCO */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5 text-amber-400" strokeWidth={1.8} />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                6. Derechos de los Usuarios (ARCO)
              </h3>
            </div>
            <p>
              Los usuarios de MVP Sports Suite gozan de la totalidad de los derechos consagrados en la Ley N° 19.628:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-center text-[10px]">
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white block mb-0.5">Acceso</span> Conocer qué datos recopilamos.
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white block mb-0.5">Rectificación</span> Corregir datos erróneos.
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white block mb-0.5">Cancelación</span> Eliminar tu cuenta personal.
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-md">
                <span className="font-bold text-white block mb-0.5">Oposición</span> Oponerse a ciertos usos.
              </div>
            </div>
            <p className="pt-2 text-[11px]">
              Para ejercer tus derechos ARCO, escribe un correo con tu RUT a: <a href="mailto:soporte@mvpsports.cl" className="text-white hover:text-[#00df82] transition-colors font-bold uppercase tracking-wider">soporte@mvpsports.cl</a>.
            </p>
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
