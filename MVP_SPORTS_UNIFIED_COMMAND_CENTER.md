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
| **State (Web)** | React Context + TanStack React Query | 5.x |
| **Testing** | Vitest + React Testing Library + Playwright | 4.x / 16.x / 1.x |
| **CI/CD** | GitHub Actions (2 workflows) | - |
| **PWA** | Manifest + service worker | - |
| **i18n** | LocaleContext (ES/EN) | - |

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
- Error page dedicado (`error.tsx`)

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

#### Sistema de Error Handling
- `app/error.tsx` — Error global con captura Sentry
- `app/dashboard/error.tsx` — Error del dashboard con botón reintentar
- `app/login/error.tsx` — Error de autenticación
- `app/global-error.tsx` — Error crítico del servidor (500)

#### Loading States
- `app/dashboard/loading.tsx` — Skeleton con KPI grid, chart, y tabla
- Componentes reutilizables: `Skeleton`, `SkeletonCard`, `SkeletonChart`, `SkeletonKpiGrid`, `SkeletonTable`

#### Data Fetching (TanStack React Query)
- Provider global en `app/layout.tsx`
- Hooks personalizados en `hooks/`:
  - `useFirestoreQuery` — Hooks base (useCollection, useCollectionRealtime, useDocument)
  - `useTenants` — Query y filtros por owner
  - `useBookings` — Query por tenant, rango de fechas, recientes
  - `useCollections` — Audit, invoices, users, settings, courts
- Caché configurada: staleTime 2min, gcTime 5min, refetchOnWindowFocus

#### Internacionalización (i18n)
- `context/LocaleContext.tsx` — Provider con detección/ persistencia
- `messages/es.json` + `messages/en.json` — Traducciones iniciales
- Hook `useLocale()` para acceso en componentes

#### PWA
- `public/manifest.json` — Configuración completa (nombre, icons, theme_color)
- `public/icons/` — Iconos SVG 192px y 512px
- Meta tags en layout: `apple-mobile-web-app-capable`, `theme-color`

#### Componentes UI Reutilizables
- `PanelGlass`, `TarjetaKpi`, `BotonAccion`, `SystemStatusRow` (DashboardWidgets.tsx)
- `MetricCard`, `RevenueChart`, `ManualBookingModal`, `BadgesConfigModal`
- `SportsIcons` (SVG dinámicos para 6 deportes)
- `Skeleton.tsx` — 6 variantes de skeleton loaders
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

| Función | Tipo | Propósito | Seguridad |
|---|---|---|---|
| `awardPlayerXp` | Callable | XP por checkin/match/win/mvp | Role check + rate limit |
| `createWebpayTransaction` | Callable | Inicia Webpay Plus multi-tenant | Rate limit + auth |
| `commitWebpayTransaction` | HTTP | Webhook Transbank | Secreto + idempotencia |
| `startOneclickInscription` | Callable | Inicia inscripción Oneclick Mall | Rate limit + auth |
| `finishOneclickInscription` | HTTP | Webhook finalización | Secreto + idempotencia |
| `authorizeOneclickPayment` | Callable | Cobro con tarjeta guardada | Rate limit + auth |
| `cleanupPendingBookings` | Scheduled (5min) | Elimina bookings pending >15 min | - |
| `refundBookingPayment` | Callable | Reembolso parcial (97%) | Rate limit + auth |
| `sendAuthEmail` | Callable | Emails verify/reset vía Resend | Rate limit + auth |

#### Firestore Security Rules (240 líneas)
- Roles: `isSuperAdmin()`, `isOwner()`, `isManager()`, `isStaff()`
- Aislamiento multi-tenant por `tenantId`
- Protección: payments solo Cloud Functions, audit solo staff+, rate_limits collection
- Sin emails hardcodeados

#### Transbank SDK Wrapper
- Webpay Plus + Oneclick Mall (create, commit, refund, inscription, authorize)
- Detección de entorno por array de prefijos (`TEST_CODE_PREFIXES`)
- Opciones multi-tenant por recinto
- Fallback a IntegrationCommerceCodes

---

## 🔒 SEGURIDAD (8 issues corregidos)

| Issue | Riesgo | Solución |
|---|---|---|
| Admin SDK JSON en git | 🔴 Crítico | .gitignore + rotación |
| payments.create sin restricción | 🔴 Crítico | Firestore rules |
| Webhooks sin verificación | 🔴 Crítico | Secreto compartido + idempotencia |
| isSuperAdmin hardcodea email | 🔴 Crítico | Solo por rol |
| Sin rate limiting | 🟠 Alto | Firestore counters por función/usuario |
| audit writes públicos | 🟠 Alto | Restringido a staff+ |
| URLs hardcodeadas | 🟠 Alto | Env vars (CF_BASE_URL, ONECLICK_BASE_URL) |
| API sin autenticación | 🟠 Alto | Firebase token verify en /api/send-email |

---

## 🐛 BUGS CORREGIDOS (24)

| Área | Bugs | Fix |
|---|---|---|
| AdminDashboard | B1: churn, B2: prevMonthRevenue, B3: error callbacks | ✅ |
| OwnerDashboard | B4: rango 7d, B5: venueIds limit | ✅ |
| ManagerDashboard | B6: orden, B7: Timestamp instanceof | ✅ |
| RevenueChart | B8: días del mes | ✅ |
| AdminKpiSection | B9: trends hardcodeados | ✅ |
| RecentActivitySidebar | B10: texto engañoso | ✅ |
| Sidebar | B11: overflow conflict | ✅ |
| login | B12: string matching frágil | ✅ |
| seed-admin | B13: ID hardcodeado | ✅ |
| send-email API | B14: from sandbox | ✅ |
| MetricCard | B15: icon any | ✅ |
| DashboardWidgets | B16: props any | ✅ |
| firestore.rules | B17: audit, B23: email, B24: payments | ✅ |
| index.ts backend | B18-B19: URLs, B20: role check, B21: date parsing | ✅ |
| transbank.ts | B22: prefijo 5970 | ✅ |

---

## 🧪 TESTING

### Web — 15 tests, 3 suites
| Suite | Tests | Descripción |
|---|---|---|
| `MetricCard.test.tsx` | 4 | Render, subtext, icon |
| `DashboardWidgets.test.tsx` | 7 | PanelGlass, TarjetaKpi, BotonAccion |
| `RevenueChart.test.tsx` | 4 | Modos histórico/tiempo real, daily average |

### Backend — 8 tests, 1 suite
| Suite | Tests | Descripción |
|---|---|---|
| `transbank.test.ts` | 8 | Webpay, Oneclick, refunds mockeados |

### E2E (Playwright) — 2 specs
| Spec | Tests | Descripción |
|---|---|---|
| `login.spec.ts` | 5 | Formulario, errores, navegación, dashboard redirect |
| `landing.spec.ts` | 4 | Hero, sports, modal, footer, SEO |

### Total: **23 tests, 4 suites, 0 fallos**

---

## 📁 ESTRUCTURA DEL PROYECTO

```
MVP-Sports-Suite/
├── .github/workflows/
│   ├── web-ci.yml          # CI web: lint + test + build
│   └── backend-ci.yml      # CI backend: lint + build
├── shared-types/
│   └── index.ts            # 15 interfaces compartidas
├── mvp-sports-web/
│   ├── app/
│   │   ├── layout.tsx      # QueryProvider + AuthProvider + ThemeProvider
│   │   ├── error.tsx       # Error boundary global
│   │   ├── global-error.tsx # Error crítico servidor
│   │   ├── dashboard/
│   │   │   ├── error.tsx   # Error boundary dashboard
│   │   │   ├── loading.tsx # Skeleton loading dashboard
│   │   │   └── ...         # 24 rutas
│   │   └── login/
│   │       └── error.tsx   # Error boundary login
│   ├── components/
│   │   ├── dashboard/      # Admin, Owner, Manager, KPIs, Charts
│   │   ├── ui/
│   │   │   ├── DashboardWidgets.tsx  # PanelGlass, TarjetaKpi
│   │   │   └── Skeleton.tsx          # 6 variantes skeleton
│   │   ├── courts/         # CourtCard, CourtModal, etc.
│   │   ├── landing/        # Navbar, Hero, Features, etc.
│   │   └── icons/          # SportsIcons SVG
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   ├── QueryProvider.tsx  # TanStack React Query
│   │   └── LocaleContext.tsx  # i18n ES/EN
│   ├── hooks/
│   │   ├── useFirestoreQuery.ts # Base hooks
│   │   ├── useTenants.ts
│   │   ├── useBookings.ts
│   │   └── useCollections.ts
│   ├── messages/           # es.json, en.json
│   ├── public/
│   │   ├── manifest.json   # PWA
│   │   └── icons/          # icon-192.svg, icon-512.svg
│   ├── services/           # firebase, audit, email
│   ├── tests/
│   │   ├── setup.ts
│   │   ├── __mocks__/
│   │   └── e2e/            # login.spec.ts, landing.spec.ts
│   ├── sentry.*.config.ts  # Client, server, edge
│   └── vitest.config.ts
├── mvp-sports-backend/
│   ├── firestore.rules     # 240 líneas con roles
│   ├── functions/src/
│   │   ├── index.ts        # 9 Cloud Functions
│   │   ├── transbank.ts    # Wrapper SDK
│   │   ├── rateLimiter.ts  # Rate limiting por función/usuario
│   │   └── __tests__/
│   │       └── transbank.test.ts  # 8 tests
│   └── firebase.json
└── mvp-sports-app/
    └── ...                 # Expo / React Native
```

---

## 📊 ESTADO DEL SISTEMA

| Componente | Funcional | Seguro | Con Tests |
|---|---|---|---|
| **Backend (9 CF)** | ✅ 100% | ✅ 100% | ✅ 8 tests |
| **Web (24 rutas)** | ✅ 100% | ✅ 100% | ✅ 15 tests |
| **Seguridad (8 issues)** | - | ✅ 100% | - |
| **Bugs (24)** | ✅ 100% | - | - |
| **CI/CD** | ✅ 2 workflows | - | - |
| **Monitoreo** | ✅ Sentry | - | - |
| **Testing** | ✅ 23 tests | - | - |
| **PWA** | ✅ Manifest | - | - |
| **i18n** | ✅ ES/EN | - | - |
| **Shared Types** | ✅ 15 interfaces | - | - |

---

**ORION TECHNOLOGY - MVP Sports Chile - 2026**
*Sistemas de Inteligencia, Precisión y Despliegue Operativo*
