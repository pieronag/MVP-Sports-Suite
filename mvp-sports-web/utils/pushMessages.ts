// Texto de cada notificación push al jugador (una sola fuente para el servidor y las pruebas)
export type PushEvent =
  | { kind: "booking_confirmed"; bookingId: string; venue: string; date: string; time: string }
  | { kind: "booking_cancelled_by_venue"; bookingId: string; venue: string; date: string; time: string; refund: number }
  | { kind: "booking_refunded"; bookingId: string; refund: number }
  | { kind: "no_show"; bookingId: string; venue: string }
  | { kind: "tournament_registered"; tournament: string }
  | { kind: "academy_enrolled"; className: string };

export interface PushPayload { title: string; body: string; url: string; tag: string }

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export function pushFor(e: PushEvent): PushPayload {
  switch (e.kind) {
    case "booking_confirmed":
      return { title: "Reserva confirmada", body: `${e.venue} · ${e.date} a las ${e.time}. Muestra tu código al llegar.`, url: `/player/ticket?bookingId=${e.bookingId}`, tag: `booking-${e.bookingId}` };
    case "booking_cancelled_by_venue":
      return { title: "El recinto anuló tu reserva", body: `${e.venue} · ${e.date} ${e.time}. Te devolvemos ${clp(e.refund)} a tu medio de pago.`, url: "/player/reservas", tag: `booking-${e.bookingId}` };
    case "booking_refunded":
      return { title: "Reembolso en camino", body: `Devolvimos ${clp(e.refund)} por tu reserva cancelada.`, url: "/player/billetera", tag: `booking-${e.bookingId}` };
    case "no_show":
      return { title: "Registramos una inasistencia", body: `No registraste tu ingreso en ${e.venue}. Si fue un error, contáctanos desde Soporte.`, url: "/player/reporte", tag: `booking-${e.bookingId}` };
    case "tournament_registered":
      return { title: "Equipo inscrito", body: `Tu equipo quedó inscrito en ${e.tournament}.`, url: "/player/torneos", tag: `tournament-${e.tournament}` };
    case "academy_enrolled":
      return { title: "Inscripción confirmada", body: `Ya estás inscrito en ${e.className}.`, url: "/player/academias", tag: `academy-${e.className}` };
  }
}
