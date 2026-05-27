"use client";

import { useState } from "react";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import RegistrationModal from "../../components/landing/RegistrationModal";
import ScrollToTop from "../../components/landing/ScrollToTop";
import { 
  DocumentTextIcon, 
  CpuChipIcon, 
  ShareIcon, 
  TrashIcon, 
  LockClosedIcon, 
  UserGroupIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

export default function PrivacyPage() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const sections = [
    { id: "datos", name: "1. Datos Recopilados", icon: DocumentTextIcon },
    { id: "finalidad", name: "2. Finalidad del Uso", icon: CpuChipIcon },
    { id: "compartir", name: "3. Intercambio de Datos", icon: ShareIcon },
    { id: "retencion", name: "4. Retención y Baja", icon: TrashIcon },
    { id: "seguridad", name: "5. Medidas de Seguridad", icon: LockClosedIcon },
    { id: "derechos", name: "6. Derechos ARCO", icon: UserGroupIcon },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // Espacio para el navbar fijo
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-[#00df82] selection:text-slate-950 font-sans">
      <Navbar onRegisterClick={() => setIsRegisterOpen(true)} />

      {/* HEADER HERO */}
      <section className="relative overflow-hidden pt-48 pb-20 border-b border-white/5 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-12 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 blur-[120px] rounded-full" />
          <div className="absolute top-20 right-1/4 w-[250px] h-[250px] bg-[#00df82]/10 blur-[100px] rounded-full" />
        </div>

        <div className="container mx-auto px-6 max-w-6xl relative z-10 text-center">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-[#00df82] bg-[#00df82]/10 px-4 py-2 rounded-full border border-[#00df82]/20">
            Políticas de Privacidad
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white mt-6 mb-4 font-heading">
            Protección de <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#00df82]">Datos</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-2xl mx-auto uppercase tracking-[0.15em]">
            Última actualización: 18 de Mayo, 2026 • MVP Sports Chile
          </p>
        </div>
      </section>

      {/* CONTENT GRID */}
      <section className="py-16 container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          
          {/* SIDEBAR NAVIGATION */}
          <aside className="lg:col-span-1 lg:sticky lg:top-28 h-fit space-y-6 hidden lg:block">
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 border-b border-white/5 pb-2">
                Índice de Contenidos
              </h3>
              <nav className="flex flex-col gap-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="flex items-center gap-3 text-left py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-[0.1em] text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                    >
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                      <span className="truncate">{section.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            
            <div className="bg-gradient-to-br from-cyan-500/5 to-transparent border border-cyan-500/10 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-500" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 mb-2">Juego Limpio</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-relaxed">
                Tus datos están protegidos en Chile bajo la Ley N° 19.628 sobre Protección de la Vida Privada.
              </p>
            </div>
          </aside>

          {/* MAIN DOCUMENT TEXT */}
          <div className="lg:col-span-3 space-y-16">
            
            <div className="prose prose-invert max-w-none text-xs md:text-sm text-slate-400 leading-relaxed space-y-6">
              <p className="text-slate-300 text-sm md:text-base font-medium">
                En <strong>MVP Sports Chile</strong>, nos tomamos muy en serio la privacidad y seguridad de la información de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos, procesamos y protegemos sus datos personales al utilizar el ecosistema <strong>MVP Sports Suite</strong>, el cual comprende nuestro sitio web (Dashboard de Gestión Administrativa) y nuestra aplicación móvil.
              </p>
              <p>
                Esta política se redacta en estricto cumplimiento con la <strong>Ley N° 19.628 sobre Protección de la Vida Privada</strong> de la República de Chile y demás normativas aplicables en materia de protección de datos personales.
              </p>
            </div>

            {/* SECTIONS */}
            
            {/* 1. DATOS RECOPILADOS */}
            <div id="datos" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  1. Datos Personales que Recopilamos
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Recopilamos la información estrictamente necesaria para proveer los servicios de reservas e identidades deportivas:
                </p>
                <div className="space-y-4 mt-2">
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Información de Registro</h4>
                    <p className="text-slate-400 text-xs">
                      Nombre completo, RUN/RUT, correo electrónico y número de teléfono. Las fotos de perfil se serializan directamente en <strong>código Base64 con prefijo MIME</strong>, sincronizándose de forma segura entre las colecciones de Firestore `users`, `staff` y Firebase Auth, evitando el uso de enlaces externos volátiles.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Datos de Geolocalización</h4>
                    <p className="text-slate-400 text-xs">
                      Recopilamos la ubicación física en tiempo real (GPS) del dispositivo del jugador con precisión balanceada. Esta ubicación <strong>se procesa exclusivamente para calcular las distancias en kilómetros (KM/M)</strong> a los recintos deportivos más cercanos en la sección del mapa interactivo, y nunca se almacena en base de datos.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Historial Deportivo e Integración de Chats</h4>
                    <p className="text-slate-400 text-xs">
                      Almacenamos tu historial de partidos, puntuación competitiva (ELO), XP, medallas y membresías a legiones de equipos (Squads). Al utilizar el módulo de Squads en la aplicación móvil, procesamos los mensajes enviados a través de la herramienta de <strong>Chat Interno de Equipo</strong> para permitir la comunicación táctica y coordinación de encuentros.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-[#00df82] uppercase tracking-wider text-xs mb-2">Seguridad Transaccional (Cero Tarjetas Físicas)</h4>
                    <p className="text-slate-400 text-xs">
                      Para garantizar la máxima seguridad financiera, <strong>MVP Sports Suite no recopila ni almacena números físicos de tarjetas bancarias, claves ni códigos CVV</strong>. Todas las transacciones se realizan directamente mediante la pasarela segura **Transbank Webpay Plus** dentro de un WebView in-app. Solo almacenamos metadatos de las transacciones (ID de reserva, fecha, monto total y estado de pago).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. FINALIDAD DEL USO */}
            <div id="finalidad" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <CpuChipIcon className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  2. Finalidad del Tratamiento de Datos
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Tratamos sus datos personales con los siguientes fines operativos y comerciales legítimos:
                </p>
                <ul className="list-none space-y-3 pl-0">
                  <li className="flex items-start gap-3">
                    <ChevronRightIcon className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Reserva y Coordinación:</strong> Proveer los flujos de reserva, confirmación instantánea sin sobre-reservas y el sistema de check-in rápido vía QR en sitio.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRightIcon className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Gamificación Competitiva:</strong> Calcular y desplegar el rendimiento deportivo en el perfil, evolución de rango ELO y niveles de XP.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRightIcon className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Seguridad Forense:</strong> Registrar logs de cambios inmutables (System Audit Log) en el panel de control web para auditoría técnica y prevención de fraudes.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRightIcon className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Facturación SII:</strong> Sincronizar las ventas facturables con el Servicio de Impuestos Internos (SII) de Chile (válido en complejos con plan Elite).</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 3. INTERCAMBIO DE DATOS */}
            <div id="compartir" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <ShareIcon className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  3. Intercambio de Datos y Terceros
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  No comercializamos ni arrendamos sus datos personales. Sus datos solo se transfieren a los siguientes actores involucrados en el flujo deportivo:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Recintos Deportivos (Tenants)</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      El administrador del recinto deportivo en el que reservas recibe tu nombre, teléfono e historial básico de asistencia (Check-In) para coordinar el ingreso a la cancha.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Proveedores e Integraciones</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      **Transbank** (procesamiento y reversa de fondos), **Google Cloud/Firebase** (almacenamiento y Cloud Functions locales en Sudamérica) y **Vercel** (hosting de dashboard Next.js).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. RETENCION Y BAJA */}
            <div id="retencion" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <TrashIcon className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  4. Retención de Datos y Anonimización
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Conservamos los datos personales únicamente durante el tiempo que sea requerido para brindar el servicio de reservas y análisis.
                </p>
                <div className="p-5 bg-slate-900/80 border border-white/10 rounded-2xl space-y-3">
                  <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                    ¿Cómo funciona la baja de cuenta?
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Al presionar "Eliminar Cuenta Definitivamente" en la app móvil, el sistema remueve tus credenciales y perfil personal. No obstante, las reservas pasadas y transacciones financieras se conservan bajo un estado de <strong>anonimización irreversible</strong>, lo que significa que el balance contable del recinto se mantiene sin asociar ningún dato que permita identificarte personalmente.
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-3 border-t border-white/5 pt-3">
                    <strong>Eliminación Web:</strong> Si no tienes acceso a la aplicación y deseas solicitar la eliminación completa de tu cuenta y todos los datos asociados, envíanos un correo directamente a <a href="mailto:oriontechnologyspa@gmail.com" className="text-white font-bold">oriontechnologyspa@gmail.com</a> o <a href="mailto:soporte@mvpsports.cl" className="text-white font-bold">soporte@mvpsports.cl</a> con el asunto "Eliminar mi cuenta". Procesaremos tu solicitud en menos de 72 horas.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. MEDIDAS DE SEGURIDAD */}
            <div id="seguridad" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <LockClosedIcon className="w-5 h-5 text-[#00df82]" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  5. Resguardo y Medidas de Seguridad
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Para proteger la información personal de accesos no autorizados o pérdidas accidentales, implementamos robustas medidas tecnológicas de primer nivel:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Firestore Security Rules</h4>
                    <p className="text-slate-400 text-xs">
                      Políticas multi-inquilino a nivel de base de datos que validan que los operadores de un recinto solo puedan ver las reservas de su propio recinto, y los jugadores solo las suyas.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Cero Bloques Fantasmas</h4>
                    <p className="text-slate-400 text-xs">
                      Creación diferida de reservas en base de datos para evitar la retención innecesaria de bloques horarios y datos si la pasarela de pagos es abandonada por el jugador.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. DERECHOS ARCO */}
            <div id="derechos" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <UserGroupIcon className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  6. Derechos de los Usuarios (ARCO)
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Los usuarios de MVP Sports Suite gozan de la totalidad de los derechos consagrados en la Ley N° 19.628 sobre protección de la vida privada:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00df82] block mb-1">A - Acceso</span>
                    <p className="text-slate-400 text-[10px]">Conocer qué información personal recopilamos de usted.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block mb-1">R - Rectificación</span>
                    <p className="text-slate-400 text-[10px]">Solicitar la corrección de datos incorrectos o incompletos.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 block mb-1">C - Cancelación</span>
                    <p className="text-slate-400 text-[10px]">Solicitar la eliminación de sus datos de nuestros registros.</p>
                  </div>
                  <div className="p-4 bg-slate-900/40 border border-white/5 rounded-xl text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">O - Oposición</span>
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

      <Footer />
      <ScrollToTop />
      <RegistrationModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </main>
  );
}
