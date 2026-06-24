# 🏆 MVP SPORTS SUITE: UNIFIED COMMAND CENTER
### Manual de Operaciones y Especificación Técnica Industrial
**Propiedad de MVP SPORTS CHILE - 2026**

---

## 📂 ESTRUCTURA GENERAL DE DOCUMENTOS LEGALES
| Documento | Descripción |
| :--- | :--- |
| **[Términos y Condiciones](TERMINOS_Y_CONDICIONES.md)** | Reglas operativas, comisiones y políticas de uso de la plataforma. |
| **[Políticas de Privacidad](POLITICA_DE_PRIVACIDAD.md)** | Protección de datos bajo la Ley N° 19.628 de Chile. |
| **[Contrato B2B (SaaS)](CONTRATO_PRESTACION_SERVICIOS_B2B.md)** | Términos de software para recintos, incluyendo obligación de tramitar API Transbank (Anexo A). |

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Multi-Tenant SaaS
Cada recinto deportivo es un `tenant` con aislamiento de datos por `tenantId` en Firestore. Roles estrictos: `superadmin` > `admin` > `owner` > `manager` > `staff` > `player`.

### Stack Tecnológico
| Capa | Tecnología | Versión |
|---|---|---|
| **Web** | Next.js (App Router) + React + TypeScript + Tailwind CSS | 16.1.6 / 19.2.3 / 5.x / 3.x |
| **Mobile** | Expo + React Native + NativeWind | 54 / 0.81.5 |
| **Backend** | Firebase Cloud Functions (Node 24) + Firestore | - |
| **Payments** | Transbank SDK (Webpay Plus + Oneclick Mall) | 6.1.1 |
| **Email** | Resend API | - |
| **Monitoreo** | Sentry + Vercel Analytics/Speed Insights | - |
| **Testing** | Vitest + React Testing Library + Playwright | - |
| **CI/CD** | GitHub Actions | - |

---

## 🧩 MÓDULOS DEL SISTEMA

### 💻 Panel Web (`mvp-sports-web`)
**Deploy:** Vercel (Edge)

#### Landing Page (`/`)
- Hero, SupportedSports, AppFunctions (Bento grid), AppShowcase, AdminPreview
- Modales lazy: Registration, Terms, Privacy
- SEO con 15 keywords+ y Open Graph

#### Login (`/login`)
- Auth email/password con Firebase
- Bypass de verificación para roles staff
- Reenvío de verificación vía Cloud Function

#### Dashboard (`/dashboard`) — 24 submódulos

| Ruta | Funcionalidad |
|---|---|
| `/` | Dispatch por rol (Admin/Owner/Manager) |
| `/academy` | Gestión de academias y clases |
| `/audit` | Logs de auditoría con traceId y geolocalización IP |
| `/billing-subscription` | Planes SaaS y suscripciones |
| `/calendar` | Calendario maestro |
| `/checkin` | Dashboard de check-in con QR |
| `/courts` | Gestión completa de canchas + venue config (990 líneas) |
| `/feedback` | Reseñas de jugadores |
| `/finance` | Dashboard financiero con export PDF |
| `/gamification` | Configuración XP/badges/tiers |
| `/invoices` | Facturación |
| `/manual-booking` | Creación manual de reservas |
| `/marketing/coupons` | Campañas de cupones |
| `/metrics` | KPIs y métricas |
| `/owners` | Gestión de dueños |
| `/profile` | Perfil de usuario |
| `/report-issue` | Reporte de problemas |
| `/reports` | Reportes |
| `/settings` | 5 tabs: Comercial, Fiscal, Identidad, Staff, Núcleo (591 líneas) |
| `/staff` | Gestión de personal |
| `/tenants` | CRUD de recintos con geocoding (581 líneas) |
| `/tournaments` | Gestión de torneos |
| `/users` | Directorio de jugadores con badges/XP/tiers (888 líneas) |
| `/users/analytics` | Analytics de usuarios |

#### Componentes UI Reutilizables
- `PanelGlass`, `TarjetaKpi`, `BotonAccion`, `SystemStatusRow` (DashboardWidgets.tsx)
- `MetricCard`, `RevenueChart`, `ManualBookingModal`, `BadgesConfigModal`
- `SportsIcons` (SVG dinámicos para 6 deportes)
- Landing: Navbar, Hero, Features, AppFunctions, AppShowcase, AdminPreview, SupportedSports, Footer, modales

---

### 📱 App Móvil (`mvp-sports-app`)
**Deploy:** Google Play (Android)

- Mapa interactivo con geolocalización (Google Maps)
- Booking wizard (3 pasos: Deporte → Cancha → Fecha/Hora)
- Pagos Webpay Plus (WebView) + Oneclick Mall (tarjetas guardadas)
- Billetera digital con balance y transacciones
- Gamificación: XP, OVR, ELO, tiers (Bronce → Legend), badges
- MVP Pro Card — perfil digital del jugador
- Equipos (Squads) con chat estilo WhatsApp
- Torneos y academias
- Tickets QR para check-in
- Dark mode

---

### ☁️ Backend (`mvp-sports-backend`)
**Deploy:** Firebase Cloud Functions (southamerica-west1)

#### Cloud Functions (9 funciones)

| Función | Tipo | Propósito |
|---|---|---|
| `awardPlayerXp` | Callable | XP por checkin/match/win/mvp. Win/MVP requieren rol staff+ |
| `createWebpayTransaction` | Callable | Inicia Webpay Plus con credenciales multi-tenant |
| `commitWebpayTransaction` | HTTP | Webhook Transbank. Con verificación de secreto + idempotencia |
| `startOneclickInscription` | Callable | Inicia inscripción Oneclick Mall. Mock para pruebas |
| `finishOneclickInscription` | HTTP | Webhook finalización. Con verificación + idempotencia |
| `authorizeOneclickPayment` | Callable | Cobro con tarjeta guardada. Mock para pruebas |
| `cleanupPendingBookings` | Scheduled (5min) | Elimina bookings pending >15 min |
| `refundBookingPayment` | Callable | Reembolso parcial (97%). Mock para pruebas |
| `sendAuthEmail` | Callable | Emails verify/reset vía Resend |

#### Firestore Security Rules (240 líneas)
- Roles: `isSuperAdmin()`, `isOwner()`, `isManager()`, `isStaff()`
- Aislamiento multi-tenant por `tenantId`
- Protección: payments solo Cloud Functions, audit solo staff+, rate_limits collection

#### Rate Limiting
- Sistema con contadores en Firestore por función/usuario
- Límites: awardPlayerXp (5/min), transacciones (10/min), refund (3/min), email (3/min)

---

## 🔒 SEGURIDAD

### Implementado
- ✅ Credenciales Admin SDK rotadas y removidas de git
- ✅ Firestore Rules: payments bloqueados a solo Cloud Functions
- ✅ Webhooks Transbank con verificación de secreto compartido
- ✅ Rate limiting en todas las Callable Functions
- ✅ Audit writes restringidos a staff+
- ✅ isSuperAdmin() sin emails hardcodeados
- ✅ URLs de Cloud Functions configurables por env vars
- ✅ API `/api/send-email` con autenticación Firebase
- ✅ Dark mode con clase CSS strategy
- ✅ Idempotencia en webhooks de pago

---

## 🧪 TESTING

### Web — 15 tests, 3 suites
- `MetricCard.test.tsx` — 4 tests (render, subtext, icon)
- `DashboardWidgets.test.tsx` — 7 tests (PanelGlass, TarjetaKpi, BotonAccion)
- `RevenueChart.test.tsx` — 4 tests (modos histórico/tiempo real, daily average)

### Infraestructura
- Vitest + React Testing Library + JSDOM para tests unitarios
- Playwright configurado para tests E2E
- GitHub Actions para CI en push/PR a main

---

## 🐛 BUGS CORREGIDOS (Total: 24)

| # | Archivo | Bug | Fix |
|---|---|---|---|
| B1 | AdminDashboard.tsx | Churn calculation incorrecto | Renombrado a "INACTIVOS" |
| B2 | AdminDashboard.tsx | prevMonthRevenue nunca asignado | Calculado de facturas mes anterior |
| B3 | AdminDashboard.tsx | onSnapshot sin error callbacks | Error handlers agregados |
| B4 | OwnerDashboard.tsx | Rango 7 días incluía futuro | endDate = ahora |
| B5 | OwnerDashboard.tsx | >30 venues truncaba datos | Warning + limit 30 |
| B6 | ManagerDashboard.tsx | Orden reservas descendente | Ascendente (próximas primero) |
| B7 | ManagerDashboard.tsx | instanceof Timestamp frágil | ts.toDate() seguro |
| B8 | RevenueChart.tsx | División por 30 fijo | getDaysInCurrentMonth() |
| B9 | AdminKpiSection.tsx | Trends hardcodeados | Eliminados |
| B10 | RecentActivitySidebar.tsx | "CARGANDO ACTIVIDAD..." engañoso | "SIN ACTIVIDAD REGISTRADA" |
| B11 | Sidebar.tsx | overflow hidden conflictivo | classList.add/remove |
| B12 | login/page.tsx | String matching frágil | Cobertura ampliada |
| B13 | seed-admin.ts | ID hardcodeado | doc(collection(...)) |
| B14 | send-email/route.ts | from sandbox Resend | Configurable por env |
| B15 | MetricCard.tsx | icon: any | React.ComponentType tipado |
| B16 | DashboardWidgets.tsx | Props any | Interfaces tipadas |
| B17 | firestore.rules | audit escribible por cualquiera | Restringido a staff+ |
| B18 | index.ts | URL hardcodeada commit | getBaseUrl() con env fallback |
| B19 | index.ts | URL hardcodeada oneclick | getOneclickBaseUrl() |
| B20 | index.ts | awardPlayerXp sin role check | Win/MVP requieren staff+ |
| B21 | index.ts | Parsing date frágil | Simplificado y robusto |
| B22 | transbank.ts | startsWith("5970") frágil | TEST_CODE_PREFIXES array |
| B23 | firestore.rules | isSuperAdmin hardcodea email | Solo por rol |
| B24 | firestore.rules | payments.create público | Solo isSuperAdmin |

---

## 🚀 PRÓXIMOS PASOS

### Prioridad Alta
- **TanStack React Query** — Cache de datos Firestore para reducir lecturas (~80% menos)
- **Tests E2E** — Playwright para flujos críticos (login, dashboard, booking)
- **Tests Backend** — firebase-functions-test + rules-unit-testing

### Prioridad Media
- **i18n** — next-intl para multi-idioma
- **PWA** — Service worker + offline support
- **Storybook** — Design system documentado
- **Tipos compartidos** — Paquete shared-types entre web y backend

### Prioridad Baja
- **Notificaciones push** — Firebase Cloud Messaging
- **Mercado Pago / Stripe** — Pasarelas adicionales
- **No-Show automático** — Re-activar handleNoShows

---

## 📊 ESTADO DEL SISTEMA

| Componente | Estado | Testing |
|---|---|---|
| Landing Page | ✅ 100% | ✅ 15 tests |
| Login/Auth | ✅ 100% | - |
| AdminDashboard | ✅ 100% | - |
| OwnerDashboard | ✅ 100% | - |
| ManagerDashboard | ✅ 100% | - |
| Finance | ✅ 100% | - |
| Courts/Venues | ✅ 100% | - |
| Users/Gamification | ✅ 100% | - |
| Settings | ✅ 100% | - |
| Tenants | ✅ 100% | - |
| Cloud Functions | ✅ 100% | - |
| Transbank Payments | ✅ 100% | - |
| Security | ✅ 100% | - |
| CI/CD | ✅ 100% | - |
| Sentry Monitoring | ✅ 100% | - |

---

**ORION TECHNOLOGY - MVP Sports Chile - 2026**
*Sistemas de Inteligencia, Precisión y Despliegue Operativo*
