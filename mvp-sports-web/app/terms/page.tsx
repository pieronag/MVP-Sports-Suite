"use client";

import Link from "next/link";
import {
  SecurityCheckIcon,
  UserMinus01Icon,
  Calendar03Icon,
  CreditCardIcon,
  Alert02Icon,
  TrophyIcon,
  UserGroupIcon,
  Store01Icon,
  ScaleIcon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import LegalPage, { Bullets, Card, type LegalSection } from "../../components/legal/LegalPage";
import { LEGAL_ENTITY, LEGAL_UPDATED } from "../../components/legal/entity";

const identity = [LEGAL_ENTITY.legalName, LEGAL_ENTITY.rut && `RUT ${LEGAL_ENTITY.rut}`, LEGAL_ENTITY.address].filter(Boolean).join(", ");

const sections: LegalSection[] = [
  {
    id: "plataforma",
    name: "Qué es MVP Sports",
    icon: SecurityCheckIcon,
    content: (
      <>
        <p>
          MVP Sports es una plataforma tecnológica que conecta a jugadores con recintos deportivos. A través de ella puedes buscar
          canchas, reservar y pagar en línea, inscribirte en torneos y academias, armar equipos y llevar tu historial deportivo.
          Los recintos usan la plataforma para administrar sus canchas, reservas, cobros y personal.
        </p>
        <Card title="Quién presta cada servicio">
          <p>
            <strong className="text-white">El recinto</strong> es quien presta el servicio deportivo: arrienda la cancha, fija sus
            precios y horarios, organiza sus torneos y clases, y responde por el estado de sus instalaciones.
          </p>
          <p>
            <strong className="text-white">MVP Sports</strong> provee la tecnología: la app, el sistema de reservas, la conexión con
            el medio de pago y el soporte de la plataforma.
          </p>
        </Card>
        <Bullets
          items={[
            <><strong className="text-white">Jugador:</strong> persona que usa la app para reservar, pagar y jugar.</>,
            <><strong className="text-white">Recinto u Owner:</strong> persona natural o jurídica que contrata un plan para administrar su complejo deportivo.</>,
            <><strong className="text-white">Mánager o staff:</strong> personal autorizado por el recinto para operar el día a día (check-in, reservas manuales, caja).</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "cuenta",
    name: "Tu cuenta",
    icon: UserMinus01Icon,
    content: (
      <>
        <Bullets
          items={[
            "Para reservar necesitas una cuenta con un correo verificado. Los datos que entregues deben ser reales y estar actualizados.",
            "Si eres menor de 14 años, solo puedes usar MVP Sports con la autorización de tu padre, madre o tutor legal.",
            "Eres responsable de mantener tu contraseña en reserva y de la actividad que ocurra en tu cuenta. Si detectas un uso no autorizado, avísanos de inmediato.",
            "Está prohibido crear cuentas falsas, suplantar a otras personas o manipular estadísticas, puntos o rankings.",
          ]}
        />
        <Card title="Eliminar tu cuenta" tone="warn">
          <p>
            Puedes eliminar tu cuenta cuando quieras desde Ajustes en la app. Al hacerlo borramos tu perfil y tu acceso. Tus reservas
            pasadas no se borran porque el recinto las necesita para su contabilidad, pero quedan anonimizadas: dejan de mostrar tu
            nombre y teléfono. El detalle está en la{" "}
            <Link href="/privacy" className="text-white underline hover:text-[#00df82]">Política de Privacidad</Link>.
          </p>
        </Card>
      </>
    ),
  },
  {
    id: "reservas",
    name: "Reservas y pagos",
    icon: Calendar03Icon,
    content: (
      <>
        <Bullets
          items={[
            "Antes de pagar verás el precio final de la reserva, con los descuentos o cupones aplicados. Ese es el monto que se cobra.",
            "La reserva queda confirmada cuando el pago es aprobado. Recibes un ticket con código QR para entrar al recinto.",
            "Las reservas son por bloques de una hora en la fecha y horario elegidos, sujetos a disponibilidad.",
          ]}
        />
        <Card title="Pago 100% online">
          <p>
            Todas las reservas, inscripciones a torneos y clases se pagan en línea al momento de reservar, con{" "}
            <strong className="text-white">Mercado Pago</strong> dentro de la app. No se aceptan reservas para pagar en el recinto.
          </p>
          <p>
            Los datos de tu tarjeta van directo a Mercado Pago: MVP Sports nunca ve ni guarda el número, la fecha de vencimiento ni
            el código de seguridad. Tu banco puede pedirte una validación adicional (3D Secure). Si eliges guardar tu tarjeta,
            Mercado Pago la guarda en su sistema y nosotros solo conservamos un identificador para ofrecértela la próxima vez.
          </p>
        </Card>
        <p>
          El dinero de las reservas pagadas en línea llega directamente a la cuenta de Mercado Pago del recinto. MVP Sports no
          retiene esos fondos.
        </p>
      </>
    ),
  },
  {
    id: "cancelaciones",
    name: "Cancelaciones y reembolsos",
    icon: CreditCardIcon,
    content: (
      <>
        <div className="bg-slate-900/60 border border-white/10 rounded-md p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#00df82] bg-[#00df82]/10 px-2 py-0.5 rounded-md">
                24 horas o más antes del partido
              </span>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider pt-1">Reembolso del 97%</h4>
              <p className="text-slate-400 text-xs">
                Puedes cancelar desde la app y te devolvemos lo pagado menos un 3%, que cubre los costos de procesamiento del pago.
              </p>
            </div>
            <span className="text-base md:text-lg font-black text-[#00df82] font-mono shrink-0">97%</span>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">
                Menos de 24 horas antes
              </span>
              <h4 className="font-bold text-white text-xs uppercase tracking-wider pt-1">No se puede cancelar</h4>
              <p className="text-slate-400 text-xs">
                Dentro de las 24 horas previas al partido la reserva ya no se puede cancelar ni reembolsar: el recinto guardó la
                cancha para ti. Si no asistes, se considera inasistencia.
              </p>
            </div>
            <span className="text-base md:text-lg font-black text-red-500 font-mono shrink-0">—</span>
          </div>
        </div>
        <Bullets
          items={[
            "Los reembolsos se hacen al mismo medio de pago. El plazo en que el dinero aparece depende de Mercado Pago y de tu banco.",
            <>Si el reembolso automático falla, la app te muestra un código de reclamo <code className="text-white">MVP-REFUND-…</code>. Preséntalo al recinto, que debe hacer la devolución manualmente, y si no la resuelve escríbenos a {LEGAL_ENTITY.email}.</>,
            "Si el recinto cancela tu reserva o no puede prestarte el servicio (por ejemplo, la cancha no está disponible), tienes derecho a la devolución total de lo pagado.",
          ]}
        />
        <Card title="Derecho a retracto" tone="warn">
          <p>
            Las reservas son servicios para una fecha y hora determinadas. Por eso, de acuerdo con el artículo 3 bis de la Ley N°
            19.496, no aplica el derecho a retracto de 10 días. Las cancelaciones se rigen por las reglas de esta sección.
          </p>
        </Card>
      </>
    ),
  },
  {
    id: "asistencia",
    name: "Asistencia y no-show",
    icon: Alert02Icon,
    content: (
      <Bullets
        items={[
          "Tu asistencia se registra con el check-in: escaneando el QR de tu ticket o con la confirmación del personal del recinto.",
          "Si no te presentas, la reserva se marca como inasistencia (no-show) y el pago no se devuelve.",
          "Las inasistencias pueden descontar puntos de experiencia (XP) de tu perfil según las reglas de gamificación vigentes.",
                    "Si crees que una inasistencia se registró por error, puedes pedir que la revise una persona escribiéndonos.",
        ]}
      />
    ),
  },
  {
    id: "torneos",
    name: "Torneos, academias y comunidad",
    icon: UserGroupIcon,
    content: (
      <>
        <Bullets
          items={[
            "Los torneos y las clases los organiza cada recinto, que fija sus bases, cupos, horarios y precios. Al inscribirte aceptas esas reglas.",
            "Puedes crear equipos, chatear con tu equipo, buscar jugadores o rivales, calificar recintos y aparecer en rankings.",
            "Lo que publiques (mensajes, reseñas, descripciones de búsquedas) debe ser respetuoso. No se permite contenido ofensivo, discriminatorio, ilegal, spam ni datos personales de terceros.",
            "Podemos ocultar contenido o suspender cuentas que incumplan estas reglas, y puedes reportar cualquier abuso desde la app.",
            "Los encuentros con otros jugadores ocurren fuera de la plataforma: actúa con prudencia. MVP Sports no responde por la conducta de otros usuarios.",
          ]}
        />
      </>
    ),
  },
  {
    id: "gamificacion",
    name: "Experiencia, niveles y logros",
    icon: TrophyIcon,
    content: (
      <>
        <p>
          Al jugar acumulas experiencia (XP), subes de nivel, desbloqueas logros y apareces en los rankings.
        </p>
        <Bullets
          items={[
            "La experiencia, los niveles y los logros no son dinero: no se pueden cambiar por efectivo, vender ni transferir a otra cuenta.",
            "Podemos ajustar las reglas de experiencia y niveles avisando con anticipación.",
            "Si detectamos manipulación o fraude, podemos anular la experiencia o los logros obtenidos de esa forma.",
          ]}
        />
      </>
    ),
  },
  {
    id: "recintos",
    name: "Condiciones para recintos",
    icon: Store01Icon,
    content: (
      <>
        <Bullets
          items={[
            <>El recinto elige un plan con un cargo mensual fijo y una comisión por reserva pagada en línea. Los valores vigentes están publicados en la sección <Link href="/#planes" className="text-white underline hover:text-[#00df82]">Planes</Link>.</>,
            "El día 1 de cada mes MVP Sports emite la factura por el cargo fijo y las comisiones del mes anterior. El recinto tiene 10 días corridos para pagarla; si no lo hace, podemos suspender el acceso al panel hasta regularizar.",
            "El recinto conecta su propia cuenta de Mercado Pago y recibe directamente los pagos. Sus credenciales se guardan cifradas y solo se usan para cobrar y reembolsar sus reservas.",
            "El recinto es responsable de mantener sus precios, horarios y canchas actualizados, de prestar el servicio reservado y de hacer las devoluciones que correspondan a sus clientes.",
            "El recinto y su personal solo pueden usar los datos de los jugadores para gestionar sus reservas, torneos y clases, y deben protegerlos según la ley.",
          ]}
        />
      </>
    ),
  },
  {
    id: "responsabilidad",
    name: "Responsabilidad y disponibilidad",
    icon: Shield01Icon,
    content: (
      <Bullets
        items={[
          "Trabajamos para que la plataforma funcione siempre, pero puede haber interrupciones por mantenimiento, fallas de proveedores o causas fuera de nuestro control.",
          "MVP Sports no responde por el estado de las instalaciones, por lesiones durante la práctica deportiva ni por lo que ocurra dentro del recinto. Eso corresponde al recinto y a cada jugador.",
          "Nada de lo anterior limita los derechos que te da la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.",
          "La marca, el diseño, el software y los contenidos de MVP Sports nos pertenecen. No puedes copiarlos ni usarlos sin autorización.",
        ]}
      />
    ),
  },
  {
    id: "ley",
    name: "Cambios, ley aplicable y contacto",
    icon: ScaleIcon,
    content: (
      <>
        <Bullets
          items={[
            "Si cambiamos estos términos, te avisaremos en la app o por correo antes de que entren en vigencia. Si sigues usando MVP Sports después de esa fecha, se entiende que aceptas los cambios.",
            "Estos términos se rigen por las leyes de la República de Chile.",
            "Si tienes un problema, escríbenos primero para resolverlo. También puedes acudir al Servicio Nacional del Consumidor (SERNAC) o a los tribunales competentes de Chile.",
          ]}
        />
        <Card title="Contacto">
          <p>
            {identity ? <>{identity}. </> : null}
            Correo: <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-white underline hover:text-[#00df82]">{LEGAL_ENTITY.email}</a>
          </p>
        </Card>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Documento legal"
      title="Términos y"
      highlight="Condiciones"
      updated={LEGAL_UPDATED}
      sections={sections}
      intro={
        <>
          <p className="text-slate-300 text-sm md:text-base font-medium">
            Estos términos regulan el uso de MVP Sports ({LEGAL_ENTITY.site}), en su versión web y app, por parte de jugadores y
            recintos deportivos en Chile.
          </p>
          <p>
            Al crear una cuenta o usar la plataforma aceptas estos términos y nuestra{" "}
            <Link href="/privacy" className="text-white underline hover:text-[#00df82]">Política de Privacidad</Link>. Si no estás de
            acuerdo, no uses la plataforma.
          </p>
        </>
      }
    />
  );
}
