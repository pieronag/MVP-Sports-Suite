"use client";

import { useState } from "react";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import RegistrationModal from "../../components/landing/RegistrationModal";
import ScrollToTop from "../../components/landing/ScrollToTop";
import { 
  ShieldCheckIcon, 
  CalendarDaysIcon, 
  CreditCardIcon, 
  UserMinusIcon, 
  ScaleIcon, 
  ExclamationTriangleIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

export default function TermsPage() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const sections = [
    { id: "roles", name: "1. Roles y Definiciones", icon: ShieldCheckIcon },
    { id: "saas", name: "2. Modelo SaaS y Planes", icon: ScaleIcon },
    { id: "cuentas", name: "3. Registro y Cuentas", icon: UserMinusIcon },
    { id: "reservas", name: "4. Reservas y Pagos", icon: CalendarDaysIcon },
    { id: "cancelaciones", name: "5. Cancelaciones y Reembolsos", icon: CreditCardIcon },
    { id: "noshow", name: "6. Política de No-Show", icon: ExclamationTriangleIcon },
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
      <section className="relative overflow-hidden pt-32 pb-20 border-b border-white/5 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-12 left-1/4 w-[350px] h-[350px] bg-[#00df82]/10 blur-[120px] rounded-full" />
          <div className="absolute top-20 right-1/4 w-[250px] h-[250px] bg-cyan-500/10 blur-[100px] rounded-full" />
        </div>

        <div className="container mx-auto px-6 max-w-6xl relative z-10 text-center">
          <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-[#00df82] bg-[#00df82]/10 px-4 py-2 rounded-full border border-[#00df82]/20">
            Documento Legal Oficial
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white mt-6 mb-4 font-heading">
            Términos y <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00df82] to-emerald-400">Condiciones</span>
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
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-[#00df82] transition-colors flex-shrink-0" />
                      <span className="truncate">{section.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            
            <div className="bg-gradient-to-br from-[#00df82]/5 to-transparent border border-[#00df82]/10 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-[#00df82]/10 rounded-full blur-2xl group-hover:bg-[#00df82]/20 transition-all duration-500" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[#00df82] mb-2">¿Necesitas soporte?</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-relaxed">
                Si tienes alguna consulta sobre estos términos, escríbenos directamente a:
              </p>
              <a href="mailto:soporte@mvpsports.cl" className="text-xs font-black text-white hover:text-[#00df82] transition-colors inline-block mt-3 uppercase tracking-wider">
                soporte@mvpsports.cl
              </a>
            </div>
          </aside>

          {/* MAIN DOCUMENT TEXT */}
          <div className="lg:col-span-3 space-y-16">
            
            <div className="prose prose-invert max-w-none text-xs md:text-sm text-slate-400 leading-relaxed space-y-6">
              <p className="text-slate-300 text-sm md:text-base font-medium">
                Bienvenido a <strong>MVP Sports Suite</strong>, una plataforma integral de gestión deportiva digital y reserva de recintos, operada bajo la modalidad Software as a Service (SaaS) Multi-Tenant. Estos Términos y Condiciones regulan el acceso y uso del ecosistema MVP Sports Suite, el cual incluye el sitio web (Dashboard Administrativo Next.js) y la aplicación móvil (Expo/React Native), disponibles para recintos deportivos, administradores y jugadores finales en el territorio de la República de Chile.
              </p>
              <p>
                Al registrarse, acceder o utilizar cualquier parte de la plataforma, usted acepta de manera expresa y sin reservas estar sujeto a estos Términos. Si no está de acuerdo con alguna de las disposiciones aquí establecidas, no deberá utilizar ni registrarse en la plataforma.
              </p>
            </div>

            {/* SECTIONS */}
            
            {/* 1. ROLES Y DEFINICIONES */}
            <div id="roles" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#00df82]/10 border border-[#00df82]/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="w-5 h-5 text-[#00df82]" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  1. Definiciones y Roles en el Ecosistema
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Para efectos de una correcta interpretación, se definen los siguientes roles y términos dentro de la plataforma:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">SuperAdmin (MVP Sports Chile)</h4>
                    <p className="text-slate-400 text-xs">
                      Propietario y operador del software, encargado de la mantención del código, soporte global, facturación SaaS y configuración general del ecosistema.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Dueño de Recinto (Owner)</h4>
                    <p className="text-slate-400 text-xs">
                      Persona natural o jurídica que contrata el servicio SaaS de MVP Sports Suite para gestionar complejos deportivos, configurar canchas, tarifas, torneos, academias y personal.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Mánager / Staff</h4>
                    <p className="text-slate-400 text-xs">
                      Personal designado por el Recinto para administrar el día a día operativo, incluyendo la validación física de acceso, reservas manuales e inicio de partidos en cancha.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/40 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-[#00df82] uppercase tracking-wider text-xs mb-2">Jugador (Player / Usuario Final)</h4>
                    <p className="text-slate-400 text-xs">
                      Persona natural registrada en la app móvil que busca recintos, realiza reservas de canchas, participa en torneos/academias y visualiza estadísticas competitivas (XP, ELO, Tiers).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. MODELO SAAS Y PLANES */}
            <div id="saas" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <ScaleIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  2. Relación Contractual y Modelo SaaS
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  El acceso de los Recintos al Dashboard Administrativo está sujeto al plan contratado (Feature Gating). La plataforma restringe o desbloquea módulos según el nivel contratado:
                </p>
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900/80 border-b border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="p-4">Plan contratado</th>
                        <th className="p-4">Comisión Reservas Online</th>
                        <th className="p-4">Características principales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="p-4 font-bold text-white">Free</td>
                        <td className="p-4 text-[#00df82] font-bold">8%</td>
                        <td className="p-4 text-slate-400">Sede única, gestión de canchas básica y calendario. Sin cupones ni API.</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-white">Básico</td>
                        <td className="p-4 text-[#00df82] font-bold">7%</td>
                        <td className="p-4 text-slate-400">Gestión estructurada de canchas, reportes básicos de ventas.</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-white">Pro</td>
                        <td className="p-4 text-[#00df82] font-bold">6%</td>
                        <td className="p-4 text-slate-400">Soporte multi-sede, acceso a gestión de torneos y academias.</td>
                      </tr>
                      <tr className="bg-[#00df82]/5">
                        <td className="p-4 font-bold text-[#00df82]">Elite (Full)</td>
                        <td className="p-4 text-[#00df82] font-bold">5%</td>
                        <td className="p-4 text-slate-300 font-medium">Cupones de marketing, integraciones de API personalizadas, facturación electrónica SII directa.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                  * Las comisiones se deducen automáticamente en las reservas liquidadas mediante la pasarela de pago Transbank Webpay Plus.
                </p>
              </div>
            </div>

            {/* 3. REGISTRO Y CUENTAS */}
            <div id="cuentas" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <UserMinusIcon className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  3. Registro, Identidad Deportiva y Baja
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Todos los usuarios declaran proveer información fidedigna al momento de registrarse. La cuenta móvil de Jugador está vinculada a una ficha de gamificación personal (**MVP Card**), en la cual se acumulan puntos de experiencia (XP) y rangos competitivos basados en ELO. Queda prohibida la falsificación o manipulación de datos deportivos.
                </p>
                <div className="p-5 bg-red-950/20 border border-red-900/30 rounded-xl space-y-2">
                  <h4 className="font-bold text-red-400 uppercase tracking-wider text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Política estricta de eliminación y anonimización de datos:
                  </h4>
                  <p className="text-slate-400 text-xs">
                    Cualquier jugador puede dar de baja su cuenta directamente desde la aplicación móvil. El sistema ejecutará una baja inmediata borrando de forma física sus credenciales en Firebase Auth y su perfil (<code>{"/users/{uid}"}</code>). No obstante, <strong>para resguardar el historial contable y fiscal de los recintos, sus reservas históricas no se eliminarán</strong>, sino que permanecerán registradas de forma 100% anonimizada.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. RESERVAS Y PAGOS */}
            <div id="reservas" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <CalendarDaysIcon className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  4. Proceso de Reservas y Canales de Pago
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Las reservas se realizan en un flujo secuencial progresivo (Wizard Mode) de 3 pasos para eliminar errores de contexto y sobre-reservas. Para garantizar el cumplimiento de las reservas, disponemos de dos canales transaccionales:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Pago Seguro Online</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Procesado en un WebView seguro mediante **Transbank Webpay Plus**. Para resguardar la seguridad del usuario, <strong>no almacenamos números físicos de tarjetas bancarias</strong> en la base de datos Firestore.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-900/30 border border-white/5 rounded-xl">
                    <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-2">Pago Presencial en Recinto</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Si el recinto no cuenta con pasarelas web activas o configuradas (`paymentApiActive: false`), el sistema restringe el checkout a visualización presencial, rindiéndose el cobro al administrador en sitio (POS físico, transferencia o efectivo).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. CANCELACIONES Y REEMBOLSOS */}
            <div id="cancelaciones" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CreditCardIcon className="w-5 h-5 text-[#00df82]" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  5. Políticas de Cancelación y Reembolso
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  Las cancelaciones voluntarias de reservas abonadas de forma online están estrictamente limitadas a las siguientes reglas de negocio:
                </p>

                {/* Glassmorphic rule card */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 justify-between border-b border-white/5 pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#00df82] bg-[#00df82]/10 px-2 py-0.5 rounded">
                        Más de 4 Horas antes
                      </span>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">Devolución Permitida (Deducción 3%)</h4>
                      <p className="text-slate-400 text-xs">
                        Se devolverá el dinero descontando un 3% del total cobrado para mitigar las tarifas de adquirencia e impuestos de la pasarela Transbank.
                      </p>
                    </div>
                    <div className="text-left md:text-right flex-shrink-0">
                      <span className="text-lg font-black text-[#00df82]">97% devuelto</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 justify-between pt-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                        Menos de 4 Horas antes
                      </span>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">No Reembolsable</h4>
                      <p className="text-slate-400 text-xs">
                        Si cancela dentro del margen de 4 horas o si ya se realizó el Check-In de asistencia, el dinero se retiene de forma íntegra en favor del recinto.
                      </p>
                    </div>
                    <div className="text-left md:text-right flex-shrink-0">
                      <span className="text-lg font-black text-red-500">0% devuelto</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-amber-950/20 border border-amber-900/30 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-400 uppercase tracking-wider text-xs flex items-center gap-2">
                    Procedimiento ante fallas del reembolso en Transbank:
                  </h4>
                  <p className="text-slate-400 text-xs">
                    Si el reembolso automático por API falla, la plataforma liberará el bloque horario en el calendario pero guardará el estado `refund_failed`. La app del jugador desplegará un ticket especial con un código de reclamo legal: <strong>`MVP-REFUND-[ID_RESERVA_8]`</strong>. El jugador deberá presentar este código al administrador del recinto, quien está obligado por contrato comercial a realizar la devolución manual correspondiente.
                  </p>
                </div>
              </div>
            </div>

            {/* 6. POLITICA DE NO-SHOW */}
            <div id="noshow" className="scroll-mt-28 space-y-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.15em] text-white">
                  6. Reglas de Control de Asistencia (No-Show)
                </h2>
              </div>
              <div className="space-y-4 text-xs md:text-sm text-slate-400 leading-relaxed">
                <p>
                  El sistema resguarda el tiempo y disponibilidad de las canchas mediante el motor automático de No-Shows (Inasistencias), que procesa los estados basándose en la hora oficial de Chile continental:
                </p>
                <ul className="list-none space-y-3 pl-0">
                  <li className="flex items-start gap-3">
                    <ChevronRightIcon className="w-4 h-4 text-[#00df82] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Evaluación por Check-In:</strong> Toda reserva que llegue a su hora de inicio programada y no registre asistencia física validada (Check-In de QR o confirmación de ingreso del mánager) se considerará de forma automática como <strong>Inasistencia (No-Show)</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRightIcon className="w-4 h-4 text-[#00df82] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Retención del Pago:</strong> Si la reserva ya estaba pagada en línea (Transbank Webpay Plus), el pago se marca de manera definitiva como <strong>Pago Retenido</strong>. No se permite reprogramar el bloque ni solicitar reintegros.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRightIcon className="w-4 h-4 text-[#00df82] flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Cancelación de Impagos:</strong> Si la reserva fue agendada en la modalidad "Pagar en Recinto" y no se asiste ni se efectúa el check-in oportuno, se cancelará liberando inmediatamente la cancha, y el sistema penalizará la tasa de reservas futuras del jugador en dicha modalidad.
                    </span>
                  </li>
                </ul>
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
