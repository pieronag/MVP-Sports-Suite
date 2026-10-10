"use client";

import Link from "next/link";
import {
  SecurityCheckIcon,
  UserGroupIcon,
  DashboardSquare01Icon,
  ScaleIcon,
  Store01Icon,
  Calendar03Icon,
  UserMinus01Icon,
  SquareLock01Icon,
  Alert02Icon,
  MapPinIcon,
} from "@hugeicons/core-free-icons";
import LegalPage, { Bullets, Card, type LegalSection } from "../../components/legal/LegalPage";
import { LEGAL_ENTITY, LEGAL_UPDATED } from "../../components/legal/entity";

const identity = [LEGAL_ENTITY.legalName, LEGAL_ENTITY.rut && `RUT ${LEGAL_ENTITY.rut}`, LEGAL_ENTITY.address].filter(Boolean).join(", ");
const mail = <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-white underline hover:text-[#00df82]">{LEGAL_ENTITY.email}</a>;

const dataGroups = [
  { title: "Cuenta e identificación", items: "Nombre, correo, teléfono, RUT, foto de perfil, fecha de nacimiento, género y ciudad." },
  { title: "Perfil deportivo", items: "Deportes, nivel, estatura y peso (si los ingresas), partidos, goles, asistencias, XP, logros, ranking, calificaciones, equipos y búsquedas de partido." },
  { title: "Reservas y pagos", items: "Reservas, horarios, recinto, montos, cupones, estado del pago y de los reembolsos, check-in, y los identificadores que entrega Mercado Pago. Nunca el número de tu tarjeta ni su código de seguridad." },
  { title: "Ubicación", items: "Tu ubicación aproximada, solo si das permiso en tu dispositivo, para mostrarte canchas cercanas y distancias. No la guardamos en tu perfil." },
  { title: "Comunicaciones", items: "Mensajes en el chat de tu equipo, reseñas, reportes y lo que nos escribes a soporte." },
  { title: "Datos técnicos", items: "Tipo de dispositivo y navegador, registros de errores y estadísticas de uso agregadas para mejorar la app." },
];

const providers = [
  { name: "Google Firebase", use: "Inicio de sesión y base de datos", where: "Estados Unidos" },
  { name: "Vercel", use: "Servidores de la app y estadísticas de uso sin cookies", where: "Estados Unidos" },
  { name: "Mercado Pago", use: "Procesar pagos, tarjetas guardadas y reembolsos", where: "Chile y Latinoamérica" },
  { name: "Google Maps", use: "Mapa y ubicación de recintos", where: "Estados Unidos" },
  { name: "Sentry", use: "Detectar y corregir errores técnicos", where: "Estados Unidos" },
  { name: "Resend", use: "Enviar correos de verificación y avisos", where: "Estados Unidos" },
  { name: "Open-Meteo", use: "Pronóstico del clima del recinto (solo recibe la ubicación de la cancha, no tus datos)", where: "Unión Europea" },
];

const sections: LegalSection[] = [
  {
    id: "responsable",
    name: "Quién es responsable",
    icon: SecurityCheckIcon,
    content: (
      <>
        <p>
          {LEGAL_ENTITY.brand}
          {identity ? <> ({identity})</> : null} es responsable del tratamiento de los datos personales que se recogen en la
          plataforma. Para cualquier consulta sobre tus datos escríbenos a {mail}.
        </p>
        <Card title="Recintos y datos de sus clientes">
          <p>
            Cuando reservas en un recinto, ese recinto también recibe los datos necesarios para atenderte (tu nombre, teléfono,
            reserva y asistencia). El recinto debe usarlos solo para gestionar tus reservas, torneos y clases.
          </p>
        </Card>
      </>
    ),
  },
  {
    id: "datos",
    name: "Qué datos recogemos",
    icon: DashboardSquare01Icon,
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {dataGroups.map((g) => (
          <Card key={g.title} title={g.title}><p>{g.items}</p></Card>
        ))}
      </div>
    ),
  },
  {
    id: "finalidades",
    name: "Para qué los usamos",
    icon: Calendar03Icon,
    content: (
      <>
        <p>Usamos tus datos solo para lo que se indica, y cada uso tiene una base legal:</p>
        <Bullets
          items={[
            <><strong className="text-white">Prestarte el servicio</strong> (ejecución del contrato): crear tu cuenta, reservar, cobrar, reembolsar, emitir tu ticket QR, registrar tu asistencia, y gestionar torneos, academias, equipos y chat.</>,
            <><strong className="text-white">Tu perfil deportivo y la comunidad</strong> (ejecución del contrato): calcular XP, niveles, logros y rankings, y sugerirte jugadores o partidos de tu nivel y ciudad.</>,
            <><strong className="text-white">Mostrarte canchas cercanas</strong> (consentimiento): usar tu ubicación solo cuando la autorizas en tu dispositivo.</>,
            <><strong className="text-white">Seguridad y mejora</strong> (interés legítimo): prevenir fraudes y abusos, mantener registros de auditoría y corregir errores.</>,
            <><strong className="text-white">Cumplir la ley</strong> (obligación legal): conservar registros de pagos y facturación exigidos por la normativa tributaria.</>,
            <><strong className="text-white">Enviarte novedades y promociones</strong> (consentimiento): solo si lo aceptas, y puedes retirarlo cuando quieras.</>,
          ]}
        />
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </>
    ),
  },
  {
    id: "publico",
    name: "Qué ven otros usuarios",
    icon: UserGroupIcon,
    content: (
      <Bullets
        items={[
          "Otros jugadores pueden ver tu nombre, foto, ciudad, nivel, estadísticas, logros y posición en los rankings.",
          "Tus compañeros de equipo ven los mensajes del chat del equipo. Las búsquedas de partido que publicas son visibles para otros jugadores.",
          "Tu RUT, correo, teléfono, fecha de nacimiento y datos de pago nunca se muestran a otros jugadores.",
        ]}
      />
    ),
  },
  {
    id: "terceros",
    name: "Con quién los compartimos",
    icon: Store01Icon,
    content: (
      <>
        <p>
          Compartimos datos solo con el recinto donde reservas y con proveedores que nos ayudan a operar la plataforma. Ellos actúan
          por encargo nuestro y no pueden usar tus datos para fines propios.
        </p>
        <div className="border border-white/5 rounded-md overflow-hidden">
          {providers.map((p) => (
            <div key={p.name} className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 p-3 md:p-4 border-b border-white/5 last:border-b-0 bg-slate-900/20">
              <span className="font-bold text-white text-xs md:w-40 shrink-0">{p.name}</span>
              <span className="text-xs text-slate-400 flex-1">{p.use}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 md:w-40 md:text-right shrink-0">{p.where}</span>
            </div>
          ))}
        </div>
        <Card title="Transferencias internacionales" tone="warn">
          <p>
            Varios proveedores guardan datos fuera de Chile. Solo trabajamos con proveedores que ofrecen garantías adecuadas de
            protección, como cláusulas contractuales y medidas de seguridad reconocidas internacionalmente.
          </p>
        </Card>
        <p>También entregaremos datos a autoridades cuando una ley o una orden judicial lo exija.</p>
      </>
    ),
  },
  {
    id: "conservacion",
    name: "Cuánto tiempo los guardamos",
    icon: UserMinus01Icon,
    content: (
      <Bullets
        items={[
          "Mientras tu cuenta esté activa conservamos tus datos para prestarte el servicio.",
          "Si eliminas tu cuenta, borramos tu perfil y tu acceso. Tus reservas pasadas quedan anonimizadas: dejan de mostrar tu nombre y teléfono, y solo se conservan para la contabilidad del recinto.",
          "Los registros de pagos y facturación se conservan por el plazo que exige la normativa tributaria chilena (en general, 6 años).",
          "Los registros técnicos de errores se guardan por un tiempo limitado y luego se eliminan.",
        ]}
      />
    ),
  },
  {
    id: "derechos",
    name: "Tus derechos",
    icon: ScaleIcon,
    content: (
      <>
        <p>De acuerdo con la Ley N° 19.628, modificada por la Ley N° 21.719, tienes derecho a:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {[
            ["Acceso", "Saber qué datos tuyos tratamos, para qué y con quién los compartimos."],
            ["Rectificación", "Corregir datos inexactos o incompletos. Muchos los puedes editar tú mismo en Ajustes."],
            ["Supresión", "Pedir que eliminemos tus datos cuando ya no sean necesarios o retires tu consentimiento."],
            ["Oposición", "Oponerte a ciertos usos, como el envío de promociones."],
            ["Portabilidad", "Recibir tus datos en un formato estructurado y de uso común."],
            ["Bloqueo", "Pedir que suspendamos temporalmente el uso de tus datos mientras se revisa una solicitud."],
          ].map(([t, d]) => (
            <Card key={t} title={t}><p>{d}</p></Card>
          ))}
        </div>
        <Card title="Decisiones automatizadas">
          <p>
            Algunas cosas se calculan de forma automática, como tus puntos, tu nivel, tu ranking o el registro de una inasistencia.
            Puedes pedir que una persona revise cualquiera de esas decisiones y darnos tu punto de vista.
          </p>
        </Card>
        <Card title="Cómo ejercerlos" tone="ok">
          <p>
            Escríbenos a {mail} desde el correo de tu cuenta, indicando qué derecho quieres ejercer. Es gratis. Te responderemos en un
            plazo máximo de 30 días corridos, que podremos extender una vez por igual período si es necesario, avisándote el motivo.
          </p>
          <p>
            Si no quedas conforme con la respuesta, puedes reclamar ante la Agencia de Protección de Datos Personales.
          </p>
        </Card>
      </>
    ),
  },
  {
    id: "seguridad",
    name: "Seguridad",
    icon: SquareLock01Icon,
    content: (
      <Bullets
        items={[
          "Las comunicaciones viajan cifradas (HTTPS) y el acceso a los datos está restringido por reglas de seguridad según el rol de cada usuario.",
          "Los datos de tarjetas los procesa directamente Mercado Pago. Las credenciales de pago de los recintos se guardan cifradas y separadas del resto.",
          "Registramos los cambios administrativos importantes para poder auditarlos.",
          "Si ocurre un incidente de seguridad que afecte tus datos, lo informaremos a la autoridad y, cuando corresponda, a ti, según lo exige la ley.",
        ]}
      />
    ),
  },
  {
    id: "menores",
    name: "Menores de edad",
    icon: Alert02Icon,
    content: (
      <p>
        Si eres menor de 14 años, necesitas la autorización de tu padre, madre o tutor legal para usar MVP Sports, y ellos pueden
        ejercer tus derechos en tu nombre. Si detectamos una cuenta de un menor de 14 años sin esa autorización, podremos
        eliminarla.
      </p>
    ),
  },
  {
    id: "cambios",
    name: "Cookies y cambios a esta política",
    icon: MapPinIcon,
    content: (
      <Bullets
        items={[
          "Usamos el almacenamiento de tu navegador solo para mantener tu sesión y tus preferencias, como el tema claro u oscuro. Las estadísticas de uso no usan cookies de seguimiento.",
          "Si cambiamos esta política de forma importante, te avisaremos en la app o por correo antes de que entre en vigencia.",
          <>Esta política se complementa con los <Link href="/terms" className="text-white underline hover:text-[#00df82]">Términos y Condiciones</Link>.</>,
        ]}
      />
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Documento legal"
      title="Política de"
      highlight="Privacidad"
      updated={LEGAL_UPDATED}
      sections={sections}
      intro={
        <>
          <p className="text-slate-300 text-sm md:text-base font-medium">
            En MVP Sports cuidamos tus datos personales. Aquí te explicamos qué datos recogemos, para qué los usamos, con quién los
            compartimos y cómo puedes ejercer tus derechos.
          </p>
          <p>
            Esta política cumple con la Ley N° 19.628 sobre Protección de la Vida Privada, modificada por la Ley N° 21.719 sobre
            Protección y Tratamiento de Datos Personales.
          </p>
        </>
      }
    />
  );
}
