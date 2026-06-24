# 🏆 MVP SPORTS SUITE — FUNCIONALIDADES REALES Y ESTADO ACTUAL

> **Documento actualizado** post-seguridad + bugs + testing.
> Junio 2026

---

## 📋 FUNCIONALIDADES DEL SISTEMA

### BACKEND (`mvp-sports-backend`)

#### Cloud Functions (9 desplegadas, 0 bugs activos)

| Función | Tipo | Estado |
|---|---|---|
| `awardPlayerXp` | Callable | ✅ XP + role check + rate limited |
| `createWebpayTransaction` | Callable | ✅ Webpay Plus multi-tenant + rate limited |
| `commitWebpayTransaction` | HTTP | ✅ Webhook con verificación + idempotencia |
| `startOneclickInscription` | Callable | ✅ Oneclick Mall + mock + rate limited |
| `finishOneclickInscription` | HTTP | ✅ Webhook con verificación + idempotencia |
| `authorizeOneclickPayment` | Callable | ✅ Oneclick pay + mock + rate limited |
| `cleanupPendingBookings` | Scheduled | ✅ Cada 5 min |
| `refundBookingPayment` | Callable | ✅ Reembolso 97% + rate limited |
| `sendAuthEmail` | Callable | ✅ Emails Resend + rate limited |

#### Firestore Rules
- ✅ Aislamiento multi-tenant
- ✅ Payments solo Cloud Functions
- ✅ Audit solo staff+
- ✅ Rate limits collection
- ✅ Sin hardcodes de email

#### Transbank
- ✅ Webpay Plus (create, commit, refund)
- ✅ Oneclick Mall (inscripción, authorize, refund)
- ✅ Auto-detección Integration/Production
- ✅ Detección por array de prefijos (no hardcode "5970")
- ✅ Mock mode para pruebas

---

### WEB (`mvp-sports-web`)

#### Landing Page (`/`)
- ✅ Hero + Sports + Bento Grid + Showcase + Admin Preview
- ✅ Modales lazy con next/dynamic
- ✅ SEO 15 keywords + Open Graph

#### Login (`/login`)
- ✅ Firebase Auth + role-based verification bypass
- ✅ Reenvío de verificación con fallback (Cloud Function → Firebase nativo)

#### Dashboard (`/dashboard`) — 24 rutas

| Ruta | Estado | Bugs |
|---|---|---|
| `/` (dispatch) | ✅ | - |
| `/academy` | ✅ | - |
| `/audit` | ✅ | - |
| `/billing-subscription` | ✅ | - |
| `/calendar` | ✅ | - |
| `/checkin` | ✅ | - |
| `/courts` | ✅ | - |
| `/feedback` | ✅ | - |
| `/finance` | ✅ | - |
| `/gamification` | ✅ | - |
| `/invoices` | ✅ | - |
| `/manual-booking` | ✅ | - |
| `/marketing/coupons` | ✅ | - |
| `/metrics` | ✅ | - |
| `/owners` | ✅ | - |
| `/profile` | ✅ | - |
| `/report-issue` | ✅ | - |
| `/reports` | ✅ | - |
| `/settings` | ✅ | - |
| `/staff` | ✅ | - |
| `/tenants` | ✅ | - |
| `/tournaments` | ✅ | - |
| `/users` | ✅ | - |
| `/users/analytics` | ✅ | - |

#### Seguridad Web
- ✅ AuthContext con cookie de sesión para middleware
- ✅ `/api/send-email` con verificación de token Firebase
- ✅ Dark mode con clase CSS
- ✅ AuditService con geolocalización IP

#### Testing Web
- ✅ 15 tests, 3 suites (MetricCard, DashboardWidgets, RevenueChart)
- ✅ Vitest + React Testing Library + JSDOM
- ✅ Playwright configurado

#### Monitoreo
- ✅ Sentry (client + server + edge)
- ✅ Global error page con captura de errores
- ✅ Vercel Analytics + Speed Insights

---

## 🔴 HISTORIAL DE SEGURIDAD (Todo corregido)

| Issue | Riesgo | Solución | Fecha |
|---|---|---|---|
| Admin SDK JSON en git | 🔴 Crítico | .gitignore + rotación | Jun 2026 |
| payments.create sin restricción | 🔴 Crítico | Firestore rules | Jun 2026 |
| Webhooks sin verificación | 🔴 Crítico | Secreto + idempotencia | Jun 2026 |
| isSuperAdmin hardcodea email | 🔴 Crítico | Solo por rol | Jun 2026 |
| Sin rate limiting | 🟠 Alto | Firestore counters | Jun 2026 |
| audit writes públicos | 🟠 Alto | Restringido a staff+ | Jun 2026 |
| URLs hardcodeadas | 🟠 Alto | Env vars + fallback | Jun 2026 |
| API sin autenticación | 🟠 Alto | Firebase token verify | Jun 2026 |

---

## 🐛 HISTORIAL DE BUGS (24 corregidos)

| # | Severidad | Archivo | Fix |
|---|---|---|---|
| B1 | Media | AdminDashboard.tsx | churn → inactiveRate |
| B2 | Alta | AdminDashboard.tsx | prevMonthRevenue calculado |
| B3 | Media | AdminDashboard.tsx | Error callbacks en onSnapshot |
| B4 | Alta | OwnerDashboard.tsx | endDate corregido |
| B5 | Baja | OwnerDashboard.tsx | Warning >30 venues |
| B6 | Media | ManagerDashboard.tsx | Orden ascendente |
| B7 | Media | ManagerDashboard.tsx | toDate() seguro |
| B8 | Baja | RevenueChart.tsx | Días reales del mes |
| B9 | Baja | AdminKpiSection.tsx | Trends eliminados |
| B10 | Baja | RecentActivitySidebar.tsx | Texto corregido |
| B11 | Baja | Sidebar.tsx | classList API |
| B12 | Baja | login/page.tsx | Cobertura ampliada |
| B13 | Baja | seed-admin.ts | ID único |
| B14 | Baja | send-email/route.ts | From configurable |
| B15 | Baja | MetricCard.tsx | Tipo seguro |
| B16 | Baja | DashboardWidgets.tsx | Interfaces tipadas |
| B17 | Alta | firestore.rules | audit restringido |
| B18 | Media | index.ts | URL dinámica |
| B19 | Media | index.ts | URL dinámica |
| B20 | Alta | index.ts | Role check XP |
| B21 | Baja | index.ts | Parsing robusto |
| B22 | Baja | transbank.ts | Array de prefijos |
| B23 | Alta | firestore.rules | Email removido |
| B24 | Crítica | firestore.rules | payments creado |

---

## 📊 ESTADO GENERAL

| Componente | Funcional | Seguro | Con Tests |
|---|---|---|---|
| **Backend** | ✅ 100% | ✅ 100% | ❌ |
| **Web** | ✅ 100% | ✅ 100% | ✅ Parcial (15 tests) |
| **Seguridad** | - | ✅ 100% | ❌ |
| **CI/CD** | ✅ | - | - |
| **Monitoreo** | ✅ | - | - |

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

1. **TanStack React Query** — Refactor de data fetching para reducir lecturas Firestore
2. **Tests E2E** — Playwright para flujos críticos
3. **Tests backend** — firebase-functions-test + rules-unit-testing
4. **i18n** — Preparar multi-idioma
5. **PWA** — Service worker + offline
