"use client";

import { useEffect } from "react";
import { 
  XMarkIcon,
  DocumentTextIcon,
  CpuChipIcon,
  ShareIcon,
  TrashIcon,
  LockClosedIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
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
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
              Privacidad
            </span>
            <h2 className="text-sm md:text-base font-black uppercase tracking-[0.2em] text-white">
              Políticas de Privacidad
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
              En <strong>MVP Sports Chile</strong>, nos tomamos muy en serio la privacidad y seguridad de la información de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos sus datos en cumplimiento con la **Ley N° 19.628 sobre Protección de la Vida Privada** de la República de Chile.
            </p>
          </div>

          {/* 1. DATOS RECOPILADOS */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-5 h-5 text-cyan-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                1. Datos Personales que Recopilamos
              </h3>
            </div>
            <p>
              Recopilamos la información estrictamente necesaria para proveer los servicios de reservas e identidades deportivas:
            </p>
            <div className="space-y-3 mt-2 text-[11px]">
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Información de Registro</span>
                Nombre, correo electrónico y teléfono. Las fotos de perfil se serializan en <strong>Base64 con prefijo MIME</strong>, sincronizándose entre Firestore `users`, `staff` y Firebase Auth, evitando enlaces externos volátiles.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Ubicación (GPS)</span>
                Uso de ubicación en tiempo real del dispositivo del jugador con la única finalidad de **calcular distancias en kilómetros (KM/M)** a recintos deportivos cercanos (Explore Map Hub). No se almacena permanentemente.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white uppercase tracking-wider block mb-1">Historial y Chat Deportivo</span>
                Historial de reservas, partidos, nivel de puntos XP, rango de nivel ELO. Al usar Squads (Equipos) en la app, procesamos los mensajes en el **Chat Interno de Equipo** solo para la coordinación de juegos.
              </div>
              <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-[#00df82] uppercase tracking-wider block mb-1">Seguridad Financiera</span>
                **No almacenamos números de tarjetas de débito/crédito** en base de datos. Los pagos online se transaccionan de forma externa y segura en la API de **Transbank Webpay Plus** dentro de un WebView in-app.
              </div>
            </div>
          </div>

          {/* 2. FINALIDAD DEL USO */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <CpuChipIcon className="w-5 h-5 text-purple-400" />
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
              <ShareIcon className="w-5 h-5 text-blue-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                3. Intercambio de Datos y Terceros
              </h3>
            </div>
            <p>
              No vendemos ni comercializamos tus datos personales. Se transfieren únicamente de forma operativa:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Con recintos deportivos donde reservas (para el ingreso).</li>
              <li>Con Transbank Webpay Plus (para cobros y reembolsos automáticos).</li>
              <li>Con infraestructura de base de datos segura de Google Firebase/Google Cloud en Sudamérica.</li>
            </ul>
          </div>

          {/* 4. RETENCION Y BAJA */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <TrashIcon className="w-5 h-5 text-red-400" />
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
              <LockClosedIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                5. Resguardo y Medidas de Seguridad
              </h3>
            </div>
            <p>
              Implementamos medidas tecnológicas avanzadas como **Firestore Security Rules** que aíslan el acceso a los datos de cada recinto (Multi-Tenant) y del jugador, y mecanismos de creación diferida de reservas en pasarela para prevenir la retención innecesaria de bloques si no se completa la transacción.
            </p>
          </div>

          {/* 6. DERECHOS ARCO */}
          <div className="space-y-4 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
              <UserGroupIcon className="w-5 h-5 text-amber-400" />
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                6. Derechos de los Usuarios (ARCO)
              </h3>
            </div>
            <p>
              Los usuarios de MVP Sports Suite gozan de la totalidad de los derechos consagrados en la Ley N° 19.628:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-center text-[10px]">
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white block mb-0.5">Acceso</span> Conocer qué datos recopilamos.
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white block mb-0.5">Rectificación</span> Corregir datos erróneos.
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white block mb-0.5">Cancelación</span> Eliminar tu cuenta personal.
              </div>
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                <span className="font-bold text-white block mb-0.5">Oposición</span> Oponerse a ciertos usos.
              </div>
            </div>
            <p className="pt-2 text-[11px]">
              Para ejercer tus derechos ARCO, escribe un correo con tu RUT a: <a href="mailto:soporte@mvpsports.cl" className="text-white hover:text-cyan-400 transition-colors font-bold uppercase tracking-wider">soporte@mvpsports.cl</a>.
            </p>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-white/5 bg-slate-900/40 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            © 2026 MVP Sports Chile • Todos los derechos reservados.
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 bg-cyan-400 rounded-xl hover:bg-cyan-500 transition-all hover:scale-105"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
