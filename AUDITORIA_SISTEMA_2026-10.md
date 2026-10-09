# Auditoría del sistema MVP Sports — 08/10/2026

Alcance: `mvp-sports-web` (Next 16), `mvp-sports-backend` (reglas Firestore + Cloud Functions) y las consultas de `mvp-sports-app`.
Método: revisión estática del código y pruebas en `localhost:3001`. No se revisaron las reglas publicadas en Firebase (difieren del archivo local; ver C-6).
Decisión de negocio incorporada: **Mercado Pago será el único método de pago**.

Severidad: 🔴 Crítico (explotable hoy, impacto alto) · 🟠 Alto · 🟡 Medio · ⚪ Bajo

---

## 1. Seguridad

| # | Sev. | Hallazgo | Dónde | Impacto |
|---|---|---|---|---|
| C-1 | 🔴 | Cualquier usuario puede editar su propio documento `users/{uid}` o `profiles/{uid}` **sin restricción de campos**, incluido `role`. `getRole()` lee el rol desde ese documento. | `firestore.rules:67-88` | Un jugador se pone `role: 'superadmin'` desde la consola del navegador y obtiene control total (recintos, pagos, auditoría). |
| C-2 | 🔴 | Los tokens de Mercado Pago (`tenants.mercadopagoAccessToken`, `settings/global.mercadopago.accessToken`) y las credenciales Transbank viven en documentos con `allow read: if true`. | `firestore.rules:105-119` | Cualquier visitante, incluso sin sesión, puede leer los tokens y operar sobre las cuentas MP de los recintos (reembolsos, consulta de pagos de clientes). |
| C-3 | 🔴 | `GET /api/mercadopago/commit?status=approved&external_reference=ORD-…` marca la reserva como **pagada** si falta `payment_id`: confía en el parámetro `status` de la URL. | `api/mercadopago/commit/route.ts` | Reservas gratis armando la URL a mano. |
| C-4 | 🔴 | El **monto** y los datos de la reserva (`amount`, `pendingBookingData`) llegan desde el cliente y se guardan tal cual. | `api/mercadopago/create/route.ts` | Se paga $100 por una cancha de $30.000, o se inyectan campos en la reserva (`tenantId`, `price`, `status`). |
| C-5 | 🟠 | El webhook de MP no valida la firma `x-signature` y recorre los tokens de hasta 20 recintos para encontrar el pago. | `api/mercadopago/webhook/route.ts` | Llamadas falsas, uso de tokens ajenos, costo y latencia. |
| C-6 | 🟠 | Las reglas publicadas no coinciden con `firestore.rules` (el dashboard del manager recibe `permission-denied` en `bookings`, aunque el archivo lo permite). | Firebase Console vs repo | No hay una fuente de verdad: cualquier publicación puede romper o abrir algo sin aviso. |
| C-7 | 🟠 | Los roles son globales: `isManager()` no compara el recinto. Un manager del recinto A puede editar canchas, torneos, cupones y borrar reservas del recinto B. | `firestore.rules` (courts, tenants, bookings delete, coupons…) | Sabotaje o fuga de datos entre clientes B2B. |
| C-8 | 🟠 | `bookings`, `users` y `profiles` se pueden leer con cualquier sesión. | `firestore.rules:65,82,132` | Cualquier jugador descarga nombres, emails, teléfonos y reservas de toda la base. |
| C-9 | 🟠 | Cualquiera puede modificar `xp`, `stats`, `tier` y `badges` de **otro** usuario (la cláusula `hasOnly` no exige ser el dueño). | `firestore.rules:71,87` | Trampas en el ranking y la gamificación. |
| C-10 | 🟡 | `POST /api/send-auth-email` no tiene autenticación ni límite de envíos. | `api/send-auth-email/route.ts` | Spam de correos de reseteo a terceros con tu dominio; enumeración de nombres. |
| C-11 | 🟡 | `GET /api/webpay/test` es público y devuelve un `stack` en los errores. | `api/webpay/test/route.ts` | Ruido y filtración de detalles internos. Se elimina con P-1. |
| C-12 | 🟡 | `tournament_registrations`: `allow write: if isAuthenticated()`. | `firestore.rules:236` | Cualquiera inscribe o borra a otros. |
| C-13 | ⚪ | `teams` y `matchmaking` permiten crear documentos con cualquier `ownerId`/`userId`. | `firestore.rules:195,212` | Suplantación menor. |

## 2. Pagos — migración a solo Mercado Pago

Webpay y Oneclick siguen presentes en 30+ archivos: rutas `api/webpay/*`, `functions/src/transbank.ts`, checkout web y app, billetera, ajustes del recinto, métricas, facturas, landing, términos y privacidad.

| # | Tarea |
|---|---|
| P-1 | Eliminar `app/api/webpay/*`, `functions/src/transbank.ts` (+ test), los exports `createWebpayTransaction`, `commitWebpayTransaction`, `startOneclickInscription`, `finishOneclickInscription` y `authorizeOneclickPayment`, y la dependencia `transbank-sdk`. |
| P-2 | Checkout (web `player/checkout`, app `(player)/checkout.tsx`): dejar solo Mercado Pago. Eliminar tarjetas Oneclick guardadas en la billetera. |
| P-3 | Calcular el precio **en el servidor** a partir de `courts`/`tenants` + cupón validado, y crear la reserva `pending` en el servidor. El cliente envía solo `courtId`, `fecha`, `hora` y `couponId` (corrige C-4). |
| P-4 | `commit`: no confiar nunca en `status` de la URL. Consultar siempre `GET /v1/payments/{id}` (o buscar por `external_reference`) con el token del recinto (corrige C-3). |
| P-5 | Webhook: validar `x-signature`/`x-request-id` con el secreto de MP y resolver el recinto desde `metadata.tenantId` en lugar de recorrer los tokens (corrige C-5). Hacerlo idempotente. |
| P-6 | Mover los tokens MP a una colección privada (`tenant_secrets/{tenantId}`, `allow read, write: if false`), accesible solo con Admin SDK (corrige C-2). **Rotar todos los tokens actuales**: hay que asumir que ya están expuestos. |
| P-7 | Reembolsos: `refundBookingPayment` (Functions) tiene que usar la API de reembolsos de MP. |
| P-8 | Textos: landing (Hero, HowItWorks, AppFunctions, Integraciones con el logo de Transbank), términos, privacidad y dashboard (filtros "Webpay" en finanzas, métricas, facturas, AdminDashboard). |
| P-9 | Datos históricos: conservar `paymentMethod: 'webpay'` en reservas antiguas para reportes, mostrándolo como "Webpay (histórico)". |

## 3. Datos y reglas — propuesta de modelo

1. **Rol inmutable para el usuario**: en `users`/`profiles`, `update` del dueño con `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role','tenantId','tenantIds','permissions'])`. Rol y recintos solo vía Admin SDK o superadmin.
2. **Membresía por recinto**: función `canManageTenant(tid)` que mire `tid in userDoc.tenantIds` (o `tenants/{tid}.ownerId`), aplicada a courts, tenants, bookings, coupons, torneos, academia y staff.
3. **Disponibilidad pública sin datos personales**: colección `court_slots/{tenantId_courtId_fecha}` con solo horas ocupadas, mantenida por una Cloud Function (trigger en `bookings`). La app consulta eso en vez de `bookings` (`bookingService.ts:106,259`). Las calificaciones se agregan en `tenants.rating` desde una Function (`venueService.ts:319,350`).
4. `bookings` read: dueño (`userId`), personal del recinto (`canManageTenant`), superadmin.
5. Publicar las reglas **solo desde el repo** (`firebase deploy --only firestore:rules`) y probarlas con el emulador (`@firebase/rules-unit-testing`) antes de cada publicación.

## 4. Área Jugador — PWA ✅ implementada en esta sesión

| Cambio | Archivo |
|---|---|
| Manifest propio con `scope: /player`, `start_url: /player`, accesos directos (Reservas, Mapa) e íconos `any` + `maskable`. | `public/player/manifest.webmanifest` |
| Service worker: navegaciones network-first con página offline; estáticos de Next e íconos cache-first; nunca cachea `/api`, Firebase ni Mercado Pago. Solo se registra en producción. | `public/player/sw.js`, `public/player/offline.html` |
| Header `Service-Worker-Allowed: /player` para que el SW controle `/player` sin barra final. | `next.config.ts` |
| El layout del jugador pasa a ser server component con `metadata`/`viewport` (theme-color, `viewport-fit=cover`, Apple web app); la lógica cliente se mueve a `components/player/PlayerLayoutClient.tsx`. | `app/player/layout.tsx` |
| Aviso de instalación (Android/Chrome con `beforeinstallprompt`; iOS con instrucciones de "Agregar a inicio"), que se puede descartar. | `components/player/PwaSupport.tsx` |
| **Barra de navegación inferior en móvil** con safe-area. Antes, en móvil el menú del jugador no tenía cómo abrirse (`setMobileOpen(true)` nunca se llamaba). | `PlayerLayoutClient.tsx` |
| Íconos regenerados desde `LogoFondo.png` (192, 512, maskable 512, apple-touch 180). `icons/icon-192.png` era un archivo de texto "placeholder" y se eliminó. El manifest general (`/manifest.json`) ahora apunta a los íconos correctos. | `public/icons/pwa-*` |

Verificado en localhost: manifest e íconos responden 200, el header del SW está presente, el SW se activa con scope `/player` y precarga la página offline; la barra inferior se ve bien a 375px.

**Pendiente PWA**
- Push notifications (recordatorio de reserva y confirmación de pago) con FCM: requiere VAPID key y una Function.
- Al migrar las pantallas del jugador al diseño nuevo, revisar los objetivos táctiles (≥44px) y el `env(safe-area-inset-top)` en los encabezados.
- Lighthouse PWA/performance sobre el build de producción (`npm run build && npm start`).
- El retorno de Mercado Pago abre en el navegador, no en la PWA instalada; mantener `back_urls` dentro de `/player/...` para que vuelvan al scope.

## 5. Frontend y calidad

| # | Sev. | Hallazgo |
|---|---|---|
| F-1 | 🟡 | El área del jugador (20 pantallas) sigue con el diseño anterior: `lucide-react` y cientos de colores escritos a mano (reservas 84, perfil 79, reporte 74). Conviene migrarla junto con la PWA. |
| F-2 | 🟡 | Quedan íconos de Heroicons en `manual-booking`, `ManualBookingModal`, `DashboardWidgets` (flechas de tendencia), `CourtCard`, `RecentActivitySidebar` y los `error.tsx`. |
| F-3 | 🟡 | Páginas muy grandes (tournaments 128 KB, courts 103 KB, partidos 80 KB) con Firestore directo en los componentes: difíciles de mantener y de testear. Extraer servicios y hooks (`react-query` ya está instalado). |
| F-4 | ⚪ | No existe repositorio git. Inicializarlo antes de los cambios de seguridad y pagos para poder revertir. |
| F-5 | ⚪ | Advertencia de Next: falta `data-scroll-behavior="smooth"` en `<html>`. Hay un 404 de un recurso en el dashboard (sin identificar). |
| F-6 | ⚪ | Archivos sobrantes en `public/` (`app-screenshot-old*.png`, `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`). |

## 6. Orden recomendado

1. **Hoy**: `git init` + commit base (F-4). Corregir C-1 en reglas y publicarlas. Rotar los tokens MP y moverlos a `tenant_secrets` (C-2/P-6).
2. **Esta semana**: rehacer el flujo Mercado Pago (P-3, P-4, P-5) y eliminar Webpay/Oneclick (P-1, P-2, P-8).
3. **Siguiente**: modelo de membresía por recinto + `court_slots` (sección 3), lo que resuelve el `permission-denied` del manager sin abrir los datos.
4. Después: migración visual del área del jugador (F-1) y push notifications de la PWA.

---

## 7. Estado al 08/10/2026 (corregido en código, pendiente de publicar)

| Hallazgo | Estado | Commit |
|---|---|---|
| C-1 rol editable por el propio usuario | ✅ Corregido en reglas | `3de7bd5` |
| C-2 tokens MP/SII/Transbank/Resend públicos | ✅ Movidos a `tenant_secrets` / `settings_private` + script de migración. **Rotar tokens.** | `3ee8b84`, `f737704` |
| C-3 commit confiaba en `status` de la URL | ✅ Siempre verifica contra la API de MP | `3ee8b84` |
| C-4 monto definido por el cliente | ✅ Precio, cupón y disponibilidad calculados en el servidor | `3ee8b84` |
| C-5 webhook sin firma | ✅ Valida `x-signature` (si hay secreto) y usa solo el token del recinto | `3ee8b84` |
| C-7 roles globales | ✅ Alcance por recinto (`canManageTenant` / `worksAtTenant`) | reglas |
| C-9 / C-14 jugador crea o marca reservas pagadas | ✅ Solo crea reservas pendientes a su nombre; no toca campos de cobro | `f737704` |
| C-10 `send-auth-email` público | ✅ Eliminado. **Nuevo crítico:** devolvía el enlace de reset (toma de cuentas); la Function `sendAuthEmail` tampoco lo devuelve ahora | correos |
| C-11 `webpay/test` | ✅ Eliminado con todo Webpay/Oneclick | `f737704` |
| P-1…P-8 solo Mercado Pago | ✅ Web, app y Functions; reembolsos vía MP | `f737704` |
| Rendimiento | ✅ Imágenes a Storage, conteos agregados, carga diferida de jsPDF/html-to-image, sin splash fijo | `ca7d2d8` |
| C-8 lectura abierta de `bookings`/`users` | ⏳ Pendiente (requiere `court_slots` + Function) | — |
| C-12 `tournament_registrations` abierto | ⏳ Pendiente (junto con pago de torneos) | — |
| Reglas sin probar en emulador | ⏳ Suite lista en `functions/src/__tests__/firestore.rules.test.ts` (requiere Java) | — |

### Orden de publicación
1. `node --env-file=mvp-sports-web/.env.local mvp-sports-web/scripts/migrate-tenant-secrets.mjs` (revisar) y luego con `--apply`.
2. Rotar tokens de Mercado Pago, API key de Resend y credenciales Transbank expuestas.
3. Vercel: `MERCADOPAGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`; publicar web.
4. `npx firebase-tools deploy --only functions,firestore:rules,storage --project mvp-sports-chile` (tras correr las pruebas de reglas).
5. Nueva versión de la app (EAS) con `EXPO_PUBLIC_API_URL`.
