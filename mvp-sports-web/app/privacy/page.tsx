"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  CpuIcon,
  Share01Icon,
  Delete01Icon,
  SquareLock01Icon,
  UserGroupIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import LegalHeader from "../../components/legal/LegalHeader";
import Footer from "../../components/landing/Footer";
import RegistrationModal from "../../components/landing/RegistrationModal";
import ScrollToTop from "../../components/landing/ScrollToTop";

export default function PrivacyPage() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const sections = [
    { id: "datos", name: "1. Datos Recopilados", icon: File01Icon },
    { id: "finalidad", name: "2. Finalidad del Uso", icon: CpuIcon },
    { id: "compartir", name: "3. Intercambio de Datos", icon: Share01Icon },
    { id: "retencion", name: "4. Retención y Baja", icon: Delete01Icon },
    { id: "seguridad", name: "5. Medidas de Seguridad", icon: SquareLock01Icon },
    { id: "derechos", name: "6. Derechos ARCO", icon: UserGroupIcon },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 96;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementPosition = element.getBoundingClientRect().top - bodyRect;
      window.scrollTo({ top: elementPosition - offset, behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-[#00df82] selection:text-slate-950 font-sans">
      <LegalHeader
        sections={sections}
        onSectionClick={scrollToSection}
        onRegisterClick={() => setIsRegisterOpen(true)}
      />

      {/* HERO */}
      <section className="relative overflow-hidden pt-40 lg:pt-32 pb-20 border-b border-white/5">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        <div aria-hidden="true" className="absolute -top-20 left-1/4 w-[360px] h-[360px] bg-[#00df82]/12 blur-[130px] rounded-full" />
        <div aria-hidden="true" className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full" />

        <div className="container mx-auto px-6 max-w-6xl relative z-10 text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#00df82] bg-[#00df82]/10 px-4 py-2 rounded-md border border-[#00df82]/20">
            Políticas de privacidad
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white mt-6 mb-4 font-heading">
            Protección de <span className="text-gradient">Datos</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto uppercase tracking-[0.15em]">
            Última actualización: 18 de Mayo, 2026 · MVP Sports Chile
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section className="py-16 container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

          {/* SIDEBAR */}
          <aside className="lg:col-span-1 lg:sticky lg:top-24 h-fit space-y-6 hidden lg:block">
            <div className="bg-slate-900/50 border border-white/5 rounded-md p-6 backdrop-blur-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 border-b border-white/5 pb-2">
                Índice de contenidos
              </h3>
              <nav className="flex flex-col gap-1.5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="flex items-center gap-3 text-left py-2 px-3 rounded-md text-xs font-bold uppercase tracking-[0.1em] text-slate-400 hover:text-white hover:bg-[#00df82]/5 transition-all group cursor-pointer"
                  >
                    <HugeiconsIcon icon={section.icon} className="w-4 h-4 text-slate-500 group-hover:text-[#00df82] transition-colors shrink-0" strokeWidth={1.8} />
                    <span className="truncate">{section.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="bg-gradient-to-br from-[#00df82]/5 to-transparent border border-[#00df82]/10 rounded-md p-6 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-[#00df82]/10 rounded-full blur-2xl group-hover:bg-[#00df82]/20 transition-all duration-500" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#00df82] mb-2">Juego limpio</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-relaxed">
                Tus datos están protegidos en Chile bajo la Ley N° 19.628 sobre Protección de la Vida Privada.
              </p>
            </div>
          </aside>

          {/* DOCUMENT */}
          <div className="lg:col-span-3 space-y-16">

            <div className="max-w-none text-xs md:text-sm text-slate-400 leading-relaxed space-y-6">
              <p className="text-slate-300 text-sm md:text-base font-medium">
                En <strong>MVP Sports Chile</strong>, nos tomamos muy en serio la privacidad y seguridad de la información de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos, procesamos y protegemos sus datos personales al utilizar el ecosistema <strong>MVP Sports Suite</strong>, el cual comprende nuestro sitio web (Dashboard de Gestión Administrativa) y nuestra aplicación móvil.
              </p>
              <p>
                Esta política se redacta en estricto cumplimiento con la <strong>Ley N° 19.628 sobre Protección de la Vida Privada</strong> de la República de Chile y demás normativas aplicables en materia de protección de datos personales.
              </p>
            </div>

            {/* 1 */}
            <div id="datos" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <HugeiconsIcon icon={File01Icon} className="w-8 h-8 text-[#00df82] shrink-0" strokeWidth={1.8} />
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading">
                  1. Datos Personales que Recopilamos
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Recopilamos la información estrictamente necesaria para proveer los servicios de reservas e identidades deportivas:
                </p>
                <div className="space-y-4 mt-2">
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-md">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Información de registro</h4>
                    <p className="text-slate-400 text-xs">
                      Nombre completo, RUN/RUT, correo electrónico y número de teléfono. Las fotos de perfil se serializan directamente en <strong>código Base64 con prefijo MIME</strong>, sincronizándose de forma segura entre las colecciones de Firestore <code className="text-white">users</code>, <code className="text-white">staff</code> y Firebase Auth, evitando el uso de enlaces externos volátiles.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-md">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Datos de geolocalización</h4>
                    <p className="text-slate-400 text-xs">
                      Recopilamos la ubicación física en tiempo real (GPS) del dispositivo del jugador con precisión balanceada. Esta ubicación <strong>se procesa exclusivamente para calcular las distancias en kilómetros (KM/M)</strong> a los recintos deportivos más cercanos en la sección del mapa interactivo, y nunca se almacena en base de datos.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-md">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Historial deportivo e integración de chats</h4>
                    <p className="text-slate-400 text-xs">
                      Almacenamos tu historial de partidos, puntuación competitiva (ELO), XP, medallas y membresías a legiones de equipos (Squads). Al utilizar el módulo de Squads en la aplicación móvil, procesamos los mensajes enviados a través de la herramienta de <strong>Chat Interno de Equipo</strong> para permitir la comunicación táctica y coordinación de encuentros.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-md">
                    <h4 className="font-bold text-[#00df82] uppercase tracking-wider text-xs mb-2">Seguridad transaccional (cero tarjetas físicas)</h4>
                    <p className="text-slate-400 text-xs">
                      Para garantizar la máxima seguridad financiera, <strong>MVP Sports Suite no recopila ni almacena números físicos de tarjetas bancarias, claves ni códigos CVV</strong>. Todas las transacciones se realizan directamente mediante la pasarela segura <strong>Mercado Pago</strong> dentro de un WebView in-app. Solo almacenamos metadatos de las transacciones (ID de reserva, fecha, monto total y estado de pago).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2 */}
            <div id="finalidad" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <HugeiconsIcon icon={CpuIcon} className="w-8 h-8 text-purple-400 shrink-0" strokeWidth={1.8} />
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading">
                  2. Finalidad del Tratamiento de Datos
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Tratamos sus datos personales con los siguientes fines operativos y comerciales legítimos:
                </p>
                <ul className="list-none space-y-3 pl-0">
                  <li className="flex items-start gap-3">
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-[#00df82] shrink-0 mt-0.5" strokeWidth={2} />
                    <span><strong>Reserva y coordinación:</strong> Proveer los flujos de reserva, confirmación instantánea sin sobre-reservas y el sistema de check-in rápido vía QR en sitio.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-[#00df82] shrink-0 mt-0.5" strokeWidth={2} />
                    <span><strong>Gamificación competitiva:</strong> Calcular y desplegar el rendimiento deportivo en el perfil, evolución de rango ELO y niveles de XP.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-[#00df82] shrink-0 mt-0.5" strokeWidth={2} />
                    <span><strong>Seguridad forense:</strong> Registrar logs de cambios inmutables (System Audit Log) en el panel de control web para auditoría técnica y prevención de fraudes.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-[#00df82] shrink-0 mt-0.5" strokeWidth={2} />
                    <span><strong>Facturación SII:</strong> Sincronizar las ventas facturables con el Servicio de Impuestos Internos (SII) de Chile (válido en complejos con plan Elite).</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 3 */}
            <div id="compartir" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <HugeiconsIcon icon={Share01Icon} className="w-8 h-8 text-blue-400 shrink-0" strokeWidth={1.8} />
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading">
                  3. Intercambio de Datos y Terceros
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  No comercializamos ni arrendamos sus datos personales. Sus datos solo se transfieren a los siguientes actores involucrados en el flujo deportivo:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-md">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Recintos deportivos (Tenants)</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      El administrador del recinto deportivo en el que reservas recibe tu nombre, teléfono e historial básico de asistencia (Check-In) para coordinar el ingreso a la cancha.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-md">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Proveedores e integraciones</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      <strong>Mercado Pago</strong> (procesamiento y reversa de fondos), <strong>Google Cloud/Firebase</strong> (almacenamiento y Cloud Functions locales en Sudamérica) y <strong>Vercel</strong> (hosting de dashboard Next.js).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 */}
            <div id="retencion" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <HugeiconsIcon icon={Delete01Icon} className="w-8 h-8 text-red-400 shrink-0" strokeWidth={1.8} />
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading">
                  4. Retención de Datos y Anonimización
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Conservamos los datos personales únicamente durante el tiempo que sea requerido para brindar el servicio de reservas y análisis.
                </p>
                <div className="p-5 bg-slate-900/60 border border-white/10 rounded-md space-y-3">
                  <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                    ¿Cómo funciona la baja de cuenta?
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Al presionar "Eliminar Cuenta Definitivamente" en la app móvil, el sistema remueve tus credenciales y perfil personal. No obstante, las reservas pasadas y transacciones financieras se conservan bajo un estado de <strong>anonimización irreversible</strong>, lo que significa que el balance contable del recinto se mantiene sin asociar ningún dato que permita identificarte personalmente.
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-3 border-t border-white/5 pt-3">
                    <strong>Eliminación web:</strong> Si no tienes acceso a la aplicación y deseas solicitar la eliminación completa de tu cuenta y todos los datos asociados, envíanos un correo directamente a <a href="mailto:oriontechnologyspa@gmail.com" className="text-white font-bold hover:text-[#00df82] transition-colors">oriontechnologyspa@gmail.com</a> o <a href="mailto:soporte@mvpsports.cl" className="text-white font-bold hover:text-[#00df82] transition-colors">soporte@mvpsports.cl</a> con el asunto "Eliminar mi cuenta". Procesaremos tu solicitud en menos de 72 horas.
                  </p>
                </div>
              </div>
            </div>

            {/* 5 */}
            <div id="seguridad" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <HugeiconsIcon icon={SquareLock01Icon} className="w-8 h-8 text-[#00df82] shrink-0" strokeWidth={1.8} />
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading">
                  5. Resguardo y Medidas de Seguridad
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Para proteger la información personal de accesos no autorizados o pérdidas accidentales, implementamos robustas medidas tecnológicas de primer nivel:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-md">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Firestore Security Rules</h4>
                    <p className="text-slate-400 text-xs">
                      Políticas multi-inquilino a nivel de base de datos que validan que los operadores de un recinto solo puedan ver las reservas de su propio recinto, y los jugadores solo las suyas.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-md">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Cero bloques fantasmas</h4>
                    <p className="text-slate-400 text-xs">
                      Creación diferida de reservas en base de datos para evitar la retención innecesaria de bloques horarios y datos si la pasarela de pagos es abandonada por el jugador.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 */}
            <div id="derechos" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <HugeiconsIcon icon={UserGroupIcon} className="w-8 h-8 text-amber-400 shrink-0" strokeWidth={1.8} />
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading">
                  6. Derechos de los Usuarios (ARCO)
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Los usuarios de MVP Sports Suite gozan de la totalidad de los derechos consagrados en la Ley N° 19.628 sobre protección de la vida privada:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-md text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00df82] block mb-1">A · Acceso</span>
                    <p className="text-slate-400 text-[10px]">Conocer qué información personal recopilamos de usted.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-md text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block mb-1">R · Rectificación</span>
                    <p className="text-slate-400 text-[10px]">Solicitar la corrección de datos incorrectos o incompletos.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-md text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 block mb-1">C · Cancelación</span>
                    <p className="text-slate-400 text-[10px]">Solicitar la eliminación de sus datos de nuestros registros.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-md text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">O · Oposición</span>
                    <p className="text-slate-400 text-[10px]">Oponerse al procesamiento de su información para ciertos fines.</p>
                  </div>
                </div>
                <p className="pt-2">
                  Para ejercer cualquiera de estos derechos o si desea contactar a nuestro oficial de protección de datos, escriba directamente al correo: <a href="mailto:soporte@mvpsports.cl" className="text-white hover:text-[#00df82] transition-colors font-bold uppercase tracking-wider">soporte@mvpsports.cl</a>.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer
        onTermsClick={() => (window.location.href = "/terms")}
        onPrivacyClick={() => scrollToSection("datos")}
        onRegisterClick={() => setIsRegisterOpen(true)}
      />
      <ScrollToTop />
      <RegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </main>
  );
}
