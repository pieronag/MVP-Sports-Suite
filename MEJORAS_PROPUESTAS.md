# 🏆 MVP Sports Suite — Mejoras Completadas y Pendientes

> Estado actual del plan de mejoras.
> Última actualización: Junio 2026

---

## ✅ COMPLETADO (Junio 2026)

### 🔐 Seguridad (8 issues)

| Mejora | Archivos | Estado |
|---|---|---|
| M1: Admin SDK JSON → .gitignore | `.gitignore` + `git rm --cached` | ✅ |
| M3: payments.create solo Cloud Functions | `firestore.rules` | ✅ |
| M4: Verificación webhooks Transbank | `functions/src/index.ts` | ✅ |
| M5: Remover email hardcodeado en isSuperAdmin | `firestore.rules` | ✅ |
| M6: Rate limiting en Cloud Functions | `functions/src/rateLimiter.ts` + `index.ts` | ✅ |
| M7: Audit writes restringidos | `firestore.rules` | ✅ |
| M12: URLs dinámicas (env vars) | `functions/src/index.ts` | ✅ |
| M21: Auth en /api/send-email | `app/api/send-email/route.ts` | ✅ |

### 🐛 Bugs (24 bugs corregidos)

| Área | Bugs | Estado |
|---|---|---|
| AdminDashboard | B1: churn, B2: prevMonthRevenue, B3: error callbacks | ✅ |
| OwnerDashboard | B4: rango 7d, B5: venueIds limit | ✅ |
| ManagerDashboard | B6: orden, B7: Timestamp instanceof | ✅ |
| RevenueChart | B8: días del mes | ✅ |
| AdminKpiSection | B9: trends hardcodeados | ✅ |
| RecentActivitySidebar | B10: texto engañoso | ✅ |
| Sidebar | B11: overflow conflict | ✅ |
| login | B12: string matching | ✅ |
| seed-admin | B13: ID hardcodeado | ✅ |
| send-email API | B14: from sandbox, M21: auth | ✅ |
| MetricCard | B15: icon any | ✅ |
| DashboardWidgets | B16: props any | ✅ |
| firestore.rules | B17: audit, B23: email, B24: payments | ✅ |
| index.ts backend | B18-B19: URLs, B20: role check, B21: date parsing | ✅ |
| transbank.ts | B22: prefijo 5970 | ✅ |

### 🧪 Testing

| Mejora | Archivos | Estado |
|---|---|---|
| Vitest + React Testing Library | `vitest.config.ts`, `tests/`, `package.json` | ✅ |
| 15 tests en 3 suites | MetricCard, DashboardWidgets, RevenueChart | ✅ |
| Playwright configurado | E2E tests listos para implementar | ✅ |

### 🕵️ Monitoreo

| Mejora | Archivos | Estado |
|---|---|---|
| Sentry Next.js | `sentry.*.config.ts`, `global-error.tsx`, `next.config.ts` | ✅ |

### ⚡ CI/CD

| Mejora | Archivos | Estado |
|---|---|---|
| GitHub Actions web | `.github/workflows/web-ci.yml` | ✅ |
| GitHub Actions backend | `.github/workflows/backend-ci.yml` | ✅ |

---

## 📋 PENDIENTE

### 🔴 Prioridad Alta

| Mejora | Esfuerzo | Impacto |
|---|---|---|
| **TanStack React Query** — Cache de datos Firestore | 2 días | Alto (ahorro en lecturas GCP) |
| **Tests E2E con Playwright** — Login, dashboard, booking | 2 días | Alto (cobertura crítica) |
| **Tests backend** — firebase-functions-test + rules-unit-testing | 2 días | Alto (seguridad financiera) |

### 🟡 Prioridad Media

| Mejora | Esfuerzo | Impacto |
|---|---|---|
| **i18n (next-intl)** — Multi-idioma ES/EN | 2 días | Medio |
| **PWA** — Service worker, manifest, offline | 1 día | Medio |
| **Storybook** — Design system documentado | 2-3 días | Medio |
| **Tipos compartidos (shared-types)** | 4h | Medio |

### 🟢 Prioridad Baja

| Mejora | Esfuerzo | Impacto |
|---|---|---|
| Dashboard auditoría mejorado (búsqueda, filtros, CSV) | 1 día | Bajo |
| Respetar prefers-color-scheme en ThemeContext | 30min | Bajo |
| Re-activar handleNoShows (no-show automático) | 3h | Bajo |
| MRR y churn reales en AdminDashboard | 3h | Bajo |
| Notificaciones push (FCM) | 2 días | Bajo |
| Mercado Pago / Stripe | Variable | Bajo |
