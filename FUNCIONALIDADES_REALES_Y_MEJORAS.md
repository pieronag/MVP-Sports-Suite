# 🏆 MVP SPORTS SUITE — FUNCIONALIDADES REALES Y MEJORAS

> **Documento Maestro** basado en análisis exhaustivo del código fuente real (no solo documentación).
> Incluye: funcionalidades reales, estado actual, issues encontrados, y plan de mejoras.
> Enfoque: `mvp-sports-web` + `mvp-sports-backend`.

---

## 🔴 HALLAZGOS CRÍTICOS (Issues Activos)

Estos son problemas **reales** encontrados en el código que deben corregirse antes de cualquier nueva funcionalidad:

### CRIT-1: Credenciales de Firebase Admin SDK commiteadas
- **Archivo:** `mvp-sports-web/mvp-sports-chile-firebase-adminsdk-fbsvc-2dd3a075b6.json`
- **Problema:** El archivo JSON con la clave privada de Firebase Admin SDK **está siendo trackeado por git**.
- **Riesgo:** CUALQUIER persona con acceso al repo puede usar estas credenciales para obtener acceso administrativo total a Firebase (leer/escribir cualquier documento, crear usuarios, etc.).
- **Solución:** 
  1. Agregar `*firebase-adminsdk*.json` al `.gitignore` 
  2. Rotar las credenciales en Firebase Console
  3. Migrar a variables de entorno (ya existe `firebase-admin.ts` que usa env vars)

### CRIT-2: Sin tests automatizados (0 tests en web y backend)
- **Web:** No hay `vitest`, `jest`, `playwright` ni ningún framework de testing en `package.json`.
- **Backend:** `firebase-functions-test` está en devDependencies pero sin usar.
- **Riesgo:** Cada cambio es manualmente verificado. No hay red de seguridad.

### CRIT-3: Sin verificación de webhooks Transbank
- **Archivo:** `mvp-sports-backend/functions/src/index.ts` — funciones `commitWebpayTransaction` y `finishOneclickInscription`
- **Problema:** Los webhooks HTTP de Transbank no verifican la autenticidad de la petición entrante.
- **Riesgo:** Cualquier persona que conozca la URL de la Cloud Function podría enviar peticiones falsas de confirmación de pago.

### CRIT-4: Sin rate limiting en Callable Functions
- **Archivo:** `mvp-sports-backend/functions/src/index.ts`
- **Problema:** `awardPlayerXp` puede ser llamada ilimitadamente por cualquier usuario autenticado. Las transacciones Webpay/Oneclick también.
- **Riesgo:** Abuso del sistema XP (farming), ataques de denegación de servicio.

### CRIT-5: Sin monitoreo de errores
- **Problema:** No hay Sentry, Datadog, o similar. Los errores en producción solo se ven en logs de Firebase/Vercel si alguien revisa activamente.

---

## 📋 FUNCIONALIDADES REALES DEL SISTEMA (Basado en Código)

### BACKEND (`mvp-sports-backend`)

#### Cloud Functions (8 funciones desplegadas)

| Función | Tipo | Estado | Notas |
|---|---|---|---|
| `awardPlayerXp` | Callable | ✅ Funcional | Otorga XP por checkin/match/win/mvp. Actualiza xp, ovr, tier en `profiles/{uid}` |
| `createWebpayTransaction` | Callable | ✅ Funcional | Inicia transacción Webpay Plus con credenciales multi-tenant |
| `commitWebpayTransaction` | HTTP | ✅ Funcional | Webhook/redirect de Transbank. Crea booking si hay pendingBookingData |
| `startOneclickInscription` | Callable | ✅ Funcional | Inicia inscripción Oneclick Mall. Mock rápido para tarjetas de prueba |
| `finishOneclickInscription` | HTTP | ✅ Funcional | Webhook de finalización de inscripción. Guarda tarjeta en `profiles/{uid}/cards` |
| `authorizeOneclickPayment` | Callable | ✅ Funcional | Cobra con tarjeta guardada. Mock para usuarios de prueba |
| `cleanupPendingBookings` | Scheduled | ✅ Funcional | Cada 5 min. Elimina bookings `paymentStatus=pending` con >15 min de antigüedad |
| `refundBookingPayment` | Callable | ✅ Funcional | Reembolso parcial (97%). Mock para pagos de prueba |
| `sendAuthEmail` | Callable | ✅ Funcional | Envía emails verify/reset vía Resend con HTML template premium |

#### Firestore Security Rules
- **240 líneas** de reglas con roles: `superadmin` > `admin` > `owner` > `manager` > `staff` > `player`
- Colecciones protegidas: `profiles`, `users`, `staff`, `tenants`, `courts`, `bookings`, `payments`, `billing-subscription`, `invoices`, `coupons`, `teams`, `tournaments`, `academy_classes`, `reviews`, `reports`, `audit_logs`, `audit`, `maintenance`, `settings`, `gamification`
- Subcolecciones: `teams/{teamId}/messages`, `profiles/{userId}/cards`
- ✅ Aislamiento multi-tenant por `tenantId`
- ⚠️ `audit` collection permite escritura a cualquier usuario autenticado

#### Transbank SDK Wrapper (`transbank.ts`)
- Soporta Webpay Plus (create, commit, refund)
- Soporta Oneclick Mall (startInscription, finishInscription, authorize, refund)
- Auto-detección de entorno (Integration vs Production) basado en commerceCode
- Opciones multi-tenant: cada recinto puede tener su propio Commerce Code + API Key
- Fallback a IntegrationCommerceCodes si no hay credenciales

---

### WEB (`mvp-sports-web`)

#### Landing Page (`/`)
- Hero principal con llamada a la acción de registro
- `SupportedSports`: banner de deportes soportados (fútbol, pádel, tenis, etc.)
- `AppFunctions`: grid estilo Bento con funcionalidades de la app
- `AppShowcase`: sección de showcase visual de la app móvil
- `AdminPreview`: preview del panel admin para dueños de recintos
- Modales: RegistrationModal, TermsModal, PrivacyModal (carga lazy con `next/dynamic`)

#### Login (`/login`)
- Autenticación con email/contraseña + Firebase Auth
- Verificación de email con bypass para roles admin/owner/manager
- Botón de reenvío de verificación (usa Cloud Function `sendAuthEmail`)
- Dark mode toggle

#### Dashboard (`/dashboard`) — 20+ submódulos

| Ruta | Componente | Funcionalidad |
|---|---|---|
| `/` | Role-based dispatch | AdminDashboard / OwnerDashboard / ManagerDashboard |
| `/academy` | `page.tsx` | Gestión de academias/clases |
| `/audit` | `page.tsx` | Logs de auditoría inmutables (traceId TRC-XXXXXX) |
| `/billing-subscription` | `page.tsx` | Planes SaaS y suscripciones |
| `/calendar` | `page.tsx` | Calendario maestro de reservas |
| `/checkin` | `page.tsx` | Dashboard de check-in con QR |
| `/courts` | **990 líneas** | Gestión completa de canchas + venue config |
| `/feedback` | `page.tsx` | Reseñas y feedback de jugadores |
| `/finance` | **478 líneas** | Dashboard financiero con filtros y PDF export |
| `/gamification` | `page.tsx` | Configuración de XP/badges/tiers |
| `/invoices` | `page.tsx` | Facturación |
| `/manual-booking` | `page.tsx` | Creación manual de reservas |
| `/marketing/coupons` | `page.tsx` | Campañas de cupones |
| `/metrics` | `page.tsx` | KPIs y métricas |
| `/owners` | `page.tsx` + API | Gestión de dueños de recintos |
| `/profile` | `page.tsx` | Perfil de usuario |
| `/report-issue` | `page.tsx` | Reporte de problemas |
| `/reports` | `page.tsx` | Reportes generales |
| `/settings` | **591 líneas** | Settings con 5 tabs: Comercial, Fiscal, Identidad, Staff, Núcleo |
| `/staff` | `page.tsx` + actions | Gestión de staff |
| `/tenants` | **581 líneas** | CRUD de recintos con geocoding Google Maps |
| `/tournaments` | `page.tsx` | Gestión de torneos |
| `/users` | **888 líneas** | Directorio de jugadores con badges/XP/tiers |
| `/users/analytics` | `page.tsx` | Analytics de usuarios |

#### Arquitectura Web
- **Frontend:** Next.js 16 App Router + React 19 + TypeScript 5 + Tailwind CSS 3
- **Estado:** React Context (AuthContext + ThemeContext)
- **Firebase:** Client SDK configurado para southamerica-west1
- **Dashboard UI:** Componentes reutilizables: `PanelGlass`, `TarjetaKpi`, `BotonAccion`, `SystemStatusRow`
- **Auditoría:** `auditService.logAuditEvent()` con geolocalización IP vía ipapi.co
- **Email:** `emailService` con fallback automático (Cloud Function → Firebase Auth nativo)
- **API Routes:** `/api/send-auth-email` y `/api/send-email` (ambos usan Resend)
- **SEO:** Meta tags con 15 keywords + Open Graph

---

## 🐛 BUGS ENCONTRADOS EN EL CÓDIGO

### Web

| # | Archivo | Línea(s) | Bug |
|---|---|---|---|
| B1 | `AdminDashboard.tsx` | ~95 | **Cálculo de churn incorrecto**: `(total - active) / total` da el % de inactivos, no churn real |
| B2 | `AdminDashboard.tsx` | ~177 | `prevMonthRevenue` declarada pero nunca asignada. `mrrGrowth` siempre usa 0 |
| B3 | `AdminDashboard.tsx` | 89-166 | Múltiples `onSnapshot` sin callback de error. Si un listener falla, el componente se cuelga silenciosamente |
| B4 | `OwnerDashboard.tsx` | 108-109 | **Rango de 7 días incorrecto**: `endDate = now + 7 días` debería ser `now`. Incluye reservas futuras |
| B5 | `OwnerDashboard.tsx` | 121 | `venueIds.slice(0, 30)` — Firestore `in` query max 30 valores. Más de 30 venues = datos incompletos |
| B6 | `ManagerDashboard.tsx` | 215-218 | **Orden de reservas descendente** (`hourB - hourA`) en "Próximas Reservas". Debería ser ascendente |
| B7 | `ManagerDashboard.tsx` | 238 | `instanceof Timestamp` puede fallar entre módulos. Usar `ts?.toDate` |
| B8 | `RevenueChart.tsx` | 37 | Divide ingresos diarios por 30 siempre, ignorando mes real (28-31 días) |
| B9 | `AdminKpiSection.tsx` | 47-62 | Trends hardcodeados (`"+5%"`, `"-0.5%"`, `"+8%"`) no calculados de datos reales |
| B10 | `RecentActivitySidebar.tsx` | 35-50 | Datos de sistema (DB, API, Storage) completamente estáticos. Pings y alertas no reales |
| B11 | `Sidebar.tsx` | 65-72 | `document.body.style.overflow = 'hidden'` puede conflictuar con otros modales |
| B12 | `login/page.tsx` | 263 | `error.includes("verifica tu correo")` — string matching frágil, se rompe con traducciones |
| B13 | `seed-admin.ts` | 21 | Crea documento con ID hardcodeado `"emergency_superadmin"` si el usuario no existe |
| B14 | `send-email/route.ts` | 176 | `from: onboarding@resend.dev` — dominio sandbox de Resend, emails irán a spam |
| B15 | `MetricCard.tsx` | 7 | `icon` tipado como `any` |
| B16 | `TarjetaKpi` (DashboardWidgets) | 17-62 | Props tipadas como `any` — sin seguridad de tipos |
| B17 | Audit trail | Varios | `audit` collection permite escritura a cualquier usuario autenticado en Firestore Rules |

### Backend

| # | Archivo | Línea(s) | Bug |
|---|---|---|---|
| B18 | `index.ts` | 119 | URL hardcodeada `https://commitwebpaytransaction-i6cn7w2g5a-tl.a.run.app` |
| B19 | `index.ts` | 282 | URL hardcodeada `https://finishoneclickinscription-i6cn7w2g5a-tl.a.run.app` |
| B20 | `index.ts` | 66 | `awardPlayerXp` no verifica que el usuario sea owner/manager/staff para award — cualquier usuario autenticado puede auto-asignarse XP |
| B21 | `index.ts` | 199-208 | Parsing de `pendingBookingData.date` con múltiples formatos diferentes, propenso a errores |
| B22 | `transbank.ts` | 15 | `commerceCode.startsWith("5970")` para detectar Integration — frágil, cualquier código de prueba de Transbank empieza con 5970 pero podría cambiar |
| B23 | `firestore.rules` | 33 | `isSuperAdmin()` hardcodea email `piero.abarca@gmail.com` como superadmin siempre |
| B24 | `firestore.rules` | 160-164 | `payments` permite `create` a cualquier usuario autenticado — debería ser solo desde Cloud Functions |

---

## ⚠️ OTRAS OBSERVACIONES

### Documentadas pero no implementadas o incompletas
- **Mercado Pago / Stripe:** Mencionados en docs/contrato como pasarelas disponibles, pero en código solo existe Transbank
- **No-Show automático:** `handleNoShows` está comentado/desactivado en el código. La gestión es manual
- **Soporte multi-idioma:** No existe. Todo en español hardcodeado
- **Notificaciones push:** Mencionadas en algunos docs, no implementadas en web
- **Modo offline/PWA:** No implementado

### En código pero no documentado
- Modo Mock para pagos (tarjetas de prueba simuladas)
- Sistema de "strikes" por no-show (comentado pero lógica existe)
- Geocoding con Google Maps en creación de tenants
- Subcolección `cards` en `profiles/{uid}` para Oneclick Mall
- `pendingBookingData` para crear bookings post-pago

---

## 🚀 PLAN DE MEJORAS POR PRIORIDAD

### 🟥 INMEDIATO (Arreglar antes de cualquier feature nuevo)

| ID | Mejora | Esfuerzo | Impacto |
|---|---|---|---|
| M1 | **🔐 Rotar credenciales + .gitignore** — El admin SDK JSON está commiteado. Rotar en GCP Console, agregar a `.gitignore`, migrar a env vars | 1h | 🔴 Crítico |
| M2 | **🧪 Tests de seguridad en Firestore Rules** — Testear con `@firebase/rules-unit-testing` que las reglas actuales son correctas | 4h | 🔴 Crítico |
| M3 | **🔒 Bloquear `payments.create` en rules** — Solo Cloud Functions deben poder crear payments | 15min | 🔴 Crítico |
| M4 | **🛡️ Verificación de webhooks Transbank** — Validar que peticiones a commit/finish vengan de Transbank | 3h | 🔴 Crítico |

### 🟧 ALTA PRIORIDAD

| ID | Mejora | Esfuerzo | Impacto |
|---|---|---|---|
| M5 | **🔧 Arreglar bugs B1-B24** — Ver tabla de bugs arriba | 2-3 días | 🟠 Alto |
| M6 | **📊 Rate limiting en Cloud Functions** — Límites por usuario para awardPlayerXp, transacciones | 4h | 🟠 Alto |
| M7 | **📋 Logging estructurado en backend** — Reemplazar console.log con logger con niveles | 3h | 🟠 Alto |
| M8 | **🕵️ Sentry en web + backend** — Monitoreo de errores en producción | 2h | 🟠 Alto |
| M9 | **🧪 Testing web** — Vitest + React Testing Library para componentes críticos | 2 días | 🟠 Alto |
| M10 | **🧪 Testing backend** — firebase-functions-test + tests de integración | 2 días | 🟠 Alto |
| M11 | **📱 Loading/Skeleton/Error states** — Implementar en todas las páginas del dashboard | 1 día | 🟠 Alto |
| M12 | **🔧 URLs de Cloud Functions dinámicas** — Reemplazar URLs hardcodeadas en index.ts | 30min | 🟠 Alto |
| M13 | **📦 TanStack React Query** — Cache de datos Firestore para reducir lecturas | 2 días | 🟠 Alto |

### 🟡 PRIORIDAD MEDIA

| ID | Mejora | Esfuerzo | Impacto |
|---|---|---|---|
| M14 | **🌐 CI/CD (GitHub Actions)** — Pipeline para web (Vercel) + backend (Firebase) | 1 día | 🟡 Medio |
| M15 | **📐 Zod schemas compartidos** — Validación de inputs en Cloud Functions | 4h | 🟡 Medio |
| M16 | **📊 i18n (next-intl)** — Preparar multi-idioma (al menos ES/EN) | 2 días | 🟡 Medio |
| M17 | **🔐 Husky + lint-staged** — Calidad de código automática en commits | 1h | 🟡 Medio |
| M18 | **📦 Code splitting** — Lazy loading de secciones del dashboard | 3h | 🟡 Medio |
| M19 | **📱 PWA** — Service worker, manifest, offline support | 1 día | 🟡 Medio |
| M20 | **📖 Storybook** — Design system documentado | 2-3 días | 🟡 Medio |
| M21 | **🔐 Endpoints API con autenticación** — `/api/send-email` sin auth actualmente | 1h | 🟡 Medio |
| M22 | **🏗️ Tipos compartidos (shared-types)** — Interfaces comunes entre web y backend | 4h | 🟡 Medio |
| M23 | **📈 SEO avanzado** — JSON-LD, sitemap dinámico, Open Graph images | 4h | 🟡 Medio |

### 🟢 BAJA PRIORIDAD (Post-MVP sólido)

| ID | Mejora | Esfuerzo | Impacto |
|---|---|---|---|
| M24 | **📱 Dashboard de auditoría mejorado** — Búsqueda, filtros, export CSV | 1 día | 🟢 Bajo |
| M25 | **🌙 Respetar prefers-color-scheme** — ThemeContext no respeta preferencia del sistema | 30min | 🟢 Bajo |
| M26 | **↩️ Re-activar handleNoShows** — Descomentar y mejorar el scheduler de no-shows | 3h | 🟢 Bajo |
| M27 | **📊 MRR y churn reales** — Arreglar cálculos en AdminDashboard | 3h | 🟢 Bajo |

---

## 🔄 ESTADO ACTUAL DEL SISTEMA

### Lo que funciona ✅
- Landing page con SEO, modales, registro
- Login con bypass de verificación para staff
- 3 dashboards por rol con datos reales (Admin, Owner, Manager)
- CRUD completo de recintos, canchas, usuarios, staff
- Dashboard financiero con export PDF y gráficos
- Configuración de planes SaaS, branding, staff, sistema
- Gestión de jugadores con gamificación (XP, badges, tiers, OVR)
- Pagos Transbank Webpay Plus + Oneclick Mall (con mock mode)
- Reembolso parcial (97%)
- Emails transaccionales vía Resend
- Auditoría con geolocalización IP y traceId
- Sistema multi-tenant con aislamiento de datos
- Dark mode completo en web
- Dashboard de check-in y calendario

### Lo que NO funciona / está incompleto ❌
- **No-Show automático**: desactivado (handleNoShows comentado)
- **Testing**: 0 tests
- **CI/CD**: deploys manuales
- **Monitoreo**: sin Sentry ni similar
- **Seguridad payments**: webhooks sin verificar, credenciales commiteadas, rate limiting inexistente
- **Mercado Pago/Stripe**: mencionados en docs pero no implementados
- **i18n**: no existe
- **PWA**: no existe
- **Bugs B1-B24**: 24 bugs activos en código

---

## ✅ PRIMEROS PASOS RECOMENDADOS

Si quieres empezar YA, este es el orden:

```
Semana 1: 🔴 CRÍTICO
  └─ M1: Rotar credenciales + .gitignore (1h)
  └─ M3: Bloquear payments.create en rules (15min)
  └─ M4: Verificación webhooks Transbank (3h)
  └─ M5: Arreglar bugs B1-B24 de alta prioridad (1 día)

Semana 2: 🟧 ALTA
  └─ M6: Rate limiting (4h)
  └─ M7: Logging estructurado (3h)
  └─ M8: Sentry (2h)
  └─ M12: URLs dinámicas (30min)
  └─ M11: Loading/Skeleton/Error states (1 día)

Semana 3: 🟧 ALTA
  └─ M9: Tests web (2 días)
  └─ M10: Tests backend (2 días)
  └─ M13: TanStack Query (2 días)

Semana 4+: 🟡 MEDIA
  └─ CI/CD, Zod, i18n, code splitting, PWA, etc.
```

> **Nota:** No recomiendo empezar NINGUNA feature nueva hasta resolver M1 y M3 (seguridad crítica).
