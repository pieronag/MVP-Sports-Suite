# Modelo de datos v3

Versión registrada en `settings/schema.version = 3` (migración `mvp-sports-backend/scripts/migrate-v3.cjs`, 10-nov-2026; la v2 es `migrate-v2.cjs`, 12-oct-2026).

Herramientas (desde la raíz del repositorio):

- `node mvp-sports-backend/scripts/backup.cjs` — respaldo completo de Firestore (con tipos) y de Firebase Auth en `docs/backups/<fecha>/` (ignorado por git: tiene datos personales). Hacerlo siempre antes de migrar.
- `node mvp-sports-backend/scripts/inventory.cjs docs/backups/<fecha>` — campos reales por colección, con su tipo y frecuencia. Sirve para detectar desorden.
- `node mvp-sports-backend/scripts/migrate-v3.cjs [--apply]` — sin `--apply` solo simula. Es idempotente: una segunda pasada debe dar 0 cambios.

Qué ordenó la v3:

- Toda cuenta de acceso tiene su perfil en `users` y todo perfil tiene su cuenta (1 a 1).
- Fuera lo que ya nadie usaba: billetera antigua (`walletBalance`, `users/*/transactions`), tarjetas de Transbank (`users/*/cards`), `public_profiles`, ELO y sincronizaciones viejas, copia de `emailVerified` (vive en Auth).
- Reservas con un solo monto, `totalPrice` (el servidor ya no escribe `price`); el cupón solo se guarda si se usó.
- Sin campos en `null`: ausente significa lo mismo.
- `rate_limits` es estado temporal: la migración borra contadores de más de 24 h.

Reglas generales:

- **Un nombre por campo.** No se agregan variantes (`imageURL`, `plan`, `sports`, `finalPrice`…). Si un dato cambia de nombre, se migra.
- **Fechas como Timestamp**, nunca texto. Números como número.
- **Deportes con nombre oficial** (`utils/sports.ts`): Fútbol, Futbolito, Pádel, Tenis, Básquetbol, Vóleibol.
- **Roles** (`utils/roles.ts`): player, manager, owner, admin, superadmin.
- **Lo sensible lo escribe el servidor** (pagos, ingreso, inasistencias, reseñas, personal, plan, estado de cuentas). Las reglas de Firestore lo bloquean desde el navegador.
- Los datos se leen siempre a través de los modelos (`utils/*Model.ts`) y de `services/client/data/*`.

## tenants (recintos)

| Campo | Tipo | Notas |
|---|---|---|
| name | string | |
| status | "Activo" \| "Suspendido" | solo administración |
| ownerId, ownerIds | string, string[] | solo administración |
| planId | string | id de `settings/global.plans`; solo administración / servidor |
| imageUrl | string | imagen principal |
| gallery | string[] | |
| activeSports | string[] | nombres oficiales |
| pricing | { [deporte]: { weekday, weekend: { "HH:MM": número } } } | claves con nombre oficial |
| schedule | { monday…sunday: { isOpen, open, close } } | `utils/venueSchedule.ts` |
| openTime, closeTime | "HH:MM" | resumen del horario |
| address, fullAddress, commune, region, coordinates {lat, lng} | | |
| isMercadopagoActive, mercadopagoPublicKey | | el token va en `tenant_secrets` |
| rating, totalFeedbacks | número | los calcula el servidor |
| features, commission, priorityScore | | del plan; los aplica el servidor |
| pendingPlanId, pendingPlanName, pendingPlanPrice, pendingBillingCycle, scheduledChangeDate | | cambio agendado, por `/api/billing/plan` |

## bookings (reservas)

Solo existen si se pagaron (o terminaron reembolsadas o en inasistencia). Las crea el servidor al aprobarse el pago.

| Campo | Tipo | Notas |
|---|---|---|
| tenantId, tenantName, courtId, courtName | string | |
| userId, clientName, clientPhone | string | |
| sport | string | nombre oficial |
| date | Timestamp | inicio real del bloque |
| startTime, endTime | "HH:MM" | |
| totalPrice | número | monto cobrado (único campo de monto) |
| originalPrice, discountApplied, couponCode, couponId | | cupón: solo si se usó |
| paymentStatus | "paid" \| "refunded" \| "refund_failed" \| "no-show" \| "pending" | servidor |
| status | "confirmed" \| "active" \| "completed" \| "cancelled" \| "no-show" | servidor (salida: el jugador, si hubo ingreso) |
| checkIn, checkInTime, checkInBy | | servidor (`/api/bookings/checkin`) |
| refundAmount, refundFee, refundDetails, cancelledBy, cancelReason | | servidor |
| rating, feedback | | servidor (`/api/reviews`) |

## users

| Campo | Tipo | Notas |
|---|---|---|
| uid, email, displayName / fullName | string | |
| role | ver roles | solo administración / servidor |
| status | "active" \| "inactive" \| "suspended" \| "disabled" | además deshabilita la cuenta de acceso |
| tenantIds, tenantId | string[], string | personal de recintos; servidor |
| createdAt, updatedAt, lastLogin | Timestamp | |
| height, weight, level | número | nunca texto |
| mainSport, favSports | nombre oficial | |
| xp, ovr, tier, badges, stats | | los calcula el servidor |

## Otras colecciones

- `courts`: tenantId, name, sport (oficial), surface, status ("active" \| "maintenance"), maintenanceStart, maintenanceUntil.
- `staff`: ficha del personal (uid, tenantIds, RUT, teléfono). Solo la escribe el servidor.
- `reviews`: id = id de la reserva (una por partido). Solo la escribe el servidor.
- `tournaments`, `tournament_registrations`, `academy_classes` (con tenantId), `academy_enrollments`, `coupons`, `payments`, `invoices`, `teams`, `matchmaking`, `challenges`, `court_slots` (siempre con tenantId), `audit` (solo se agrega), `rate_limits` (temporal).
