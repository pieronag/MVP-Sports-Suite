# 🏆 MVP Sports Suite — Mejoras Propuestas

> Documento de mejoras considerables para el ecosistema **MVP Sports Suite**.
> Enfoque inicial: `mvp-sports-web` + `mvp-sports-backend`.

---

## 📋 Resumen Ejecutivo

El sistema está completo y funcional (100% según documentación). Las mejoras propuestas apuntan a **madurez de ingeniería**, **calidad de código**, **testing**, **observabilidad**, **seguridad** y **experiencia de desarrollo** (DX). No se modifican funcionalidades core, sino que se fortalece la base técnica para escalar con confianza.

---

## 🔴 PRIORIDAD ALTA: Backend (`mvp-sports-backend`)

### 1. Testing Automatizado en Cloud Functions
- **Situación actual:** 0 tests. Existe `firebase-functions-test` en devDependencies pero sin uso.
- **Propuesta:** Implementar suite de tests unitarios y de integración.
- **Acciones:**
  - Tests unitarios para `transbank.ts` (mockear SDK, probar modos test/prod, detección multi-tenant)
  - Tests de integración para cada Cloud Function usando `firebase-functions-test` + Firestore emulator
  - Tests de reglas de seguridad (`firestore.rules`) con `@firebase/rules-unit-testing`
- **Archivos clave:** `functions/src/transbank.ts`, `functions/src/index.ts`, `firestore.rules`

### 2. Manejo de Errores y Logging Estructurado
- **Situación actual:** Logs con `console.log`/`console.error` esparcidos, errores genéricos retornados al cliente.
- **Propuesta:** Sistema de logging estructurado con niveles y errores tipados.
- **Acciones:**
  - Crear `functions/src/utils/logger.ts` con niveles (debug, info, warn, error)
  - Crear `functions/src/utils/errors.ts` con clases de error personalizadas (`PaymentError`, `AuthError`, `ValidationError`)
  - Implementar middleware de errores para funciones HTTP y Callable
  - Incluir `requestId` en cada log para trazabilidad
- **Beneficio:** Depuración 10x más rápida en producción.

### 3. Rate Limiting y Protección de Callable Functions
- **Situación actual:** Cualquier cliente autenticado puede llamar funciones como `awardPlayerXp` sin restricción de frecuencia.
- **Propuesta:** Implementar rate limiting por usuario.
- **Acciones:**
  - Usar Firebase Realtime Database o Firestore como backend de contadores
  - Limitar `awardPlayerXp` a 1 llamada/5min por usuario (anti-farming)
  - Limitar transacciones Webpay a 5/min por usuario
  - Implementar en un wrapper reutilizable: `withRateLimit(handler, config)`
- **Beneficio:** Previene abusos y ataques de fuerza bruta.

### 4. CI/CD con GitHub Actions
- **Situación actual:** Sin CI/CD automatizado. El deploy es manual (`firebase deploy`).
- **Propuesta:** Pipeline de integración y deploy automatizado.
- **Acciones:**
  - Crear `.github/workflows/backend-ci.yml`:
    - `npm ci`, `npm run build`, `npm run lint`
    - Ejecutar tests con emuladores de Firebase
    - Deploy automático a producción al hacer merge a `main`
- **Beneficio:** Calidad garantizada en cada deploy.

### 5. Esquemas de Validación (Zod) para Cloud Functions
- **Situación actual:** Validación manual inline de parámetros en cada función.
- **Propuesta:** Esquemas Zod centralizados para validar inputs de funciones Callable.
- **Acciones:**
  - Crear `functions/src/schemas/` con schemas para cada función
  - Crear wrapper `validate(schema, handler)` que valida antes de ejecutar
  - Tipos inferidos automáticamente desde Zod
- **Beneficio:** Código más limpio, errores de validación consistentes, types seguros.

### 6. Webhook Signature Verification (Transbank)
- **Situación actual:** Los webhooks de Transbank (`commitWebpayTransaction`, `finishOneclickInscription`) no verifican firma.
- **Propuesta:** Validar que las peticiones entrantes vengan realmente de Transbank.
- **Acciones:**
  - Verificar `TBK_HEADER` o usar IP whitelist de Transbank
  - Rechazar peticiones no autenticadas con 403
- **Beneficio:** Seguridad financiera crítica. Previene webhooks falsificados.

### 7. Mejora en Reglas de Firestore
- **Situación actual:** Reglas funcionales pero con algunos permisos amplios (ej. `allow create, update, delete: if false` en payments).
- **Propuesta:** Reglas más granulares y testes automatizados.
- **Acciones:**
  - Agregar reglas para `gamification/{docId}` que solo permitan writes desde Cloud Functions
  - Restringir `audit_logs` a solo lectura para owners, escritura solo para server
  - Agregar validación de estructura de datos en reglas (ej. `resource.data.keys().hasAll(['amount', 'currency'])`)
  - Tests de reglas con `@firebase/rules-unit-testing`

---

## 🟡 PRIORIDAD MEDIA-ALTA: Web (`mvp-sports-web`)

### 8. Testing Automatizado (Frontend)
- **Situación actual:** 0 tests.
- **Propuesta:** Suite de tests con Vitest + React Testing Library + Playwright.
- **Acciones:**
  - `npm install -D vitest @testing-library/react @testing-library/jest-dom @playwright/test`
  - Tests unitarios para componentes críticos: `CourtCard`, `MetricCard`, `RevenueChart`
  - Tests de integración para dashboards por rol
  - Tests E2E con Playwright para flujos críticos: login, navegación en dashboard, creación de booking
  - Configurar en `package.json`: `"test": "vitest run"`, `"test:e2e": "playwright test"`
- **Archivos clave:** `components/dashboard/`, `components/courts/`, `app/dashboard/`

### 9. Manejo de Estados (Loading, Error, Empty)
- **Situación actual:** Muchas pantallas asumen que los datos existen sin estados de carga o error visibles.
- **Propuesta:** Componentes reutilizables para estados y Suspense boundaries.
- **Acciones:**
  - Crear `components/ui/LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`
  - Envolver secciones del dashboard en React Suspense con fallbacks
  - Implementar Error Boundaries por ruta (`error.tsx` en App Router)
  - Agregar skeleton loaders (shimmer effect) con Tailwind
- **Beneficio:** UX profesional, evita pantallas en blanco o crashes silenciosos.

### 10. Mejora en el Sistema de Auditoría
- **Situación actual:** Auditoría funcional pero sin interfaz de búsqueda/filtros avanzados.
- **Propuesta:** Dashboard de auditoría con búsqueda full-text, filtros por fecha/tipo/usuario, exportación CSV.
- **Acciones:**
  - Mejorar `app/dashboard/audit/page.tsx` con:
    - Búsqueda por texto libre
    - Filtros: rango de fechas, nivel de prioridad, usuario, tenant
    - Paginación con cursor (Firestore)
    - Exportación a CSV
    - Vista de detalle expandible para cada entry
- **Beneficio:** Compliance y debugging mejorados.

### 11. Internacionalización (i18n)
- **Situación actual:** Todo en español, hardcodeado.
- **Propuesta:** Preparar infraestructura para multi-idioma usando `next-intl`.
- **Acciones:**
  - `npm install next-intl`
  - Estructura de archivos: `messages/es.json`, `messages/en.json`
  - Migrar strings estáticos a funciones `t()`
  - Detección automática de idioma del navegador
  - Selector de idioma en landing y dashboard
- **Beneficio:** Expansión a mercados internacionales.

### 12. Estado Global y Caching con TanStack Query
- **Situación actual:** Datos de Firestore obtenidos directamente en componentes, sin caché unificada.
- **Propuesta:** Adoptar TanStack React Query para data fetching y caché.
- **Acciones:**
  - `npm install @tanstack/react-query`
  - Crear proveedor `QueryClientProvider` en `app/layout.tsx`
  - Migrar hooks de Firebase a queries con `useQuery`/`useMutation`
  - Configurar stale time, refetch intervals, y optimista UI para mutations
  - Reducir lecturas a Firestore con caché eficiente
- **Beneficio:** Menos lecturas a Firestore (ahorro en costos), UI más reactiva.

### 13. Monitoreo de Errores con Sentry
- **Situación actual:** Sin monitoreo de errores en producción.
- **Propuesta:** Integrar Sentry para rastreo de errores y rendimiento.
- **Acciones:**
  - `npm install @sentry/nextjs`
  - Configurar DSN en `next.config.ts`
  - Source maps para debugging en producción
  - Tracking de rendimiento de páginas
- **Beneficio:** Detección temprana de bugs en producción.

### 14. PWA (Progressive Web App)
- **Situación actual:** No hay soporte offline ni instalable.
- **Propuesta:** Configurar Next.js PWA con service worker.
- **Acciones:**
  - Usar `next-pwa` o `@serwist/next`
  - Manifest con íconos, splash screen, tema
  - Service worker para caché de assets y Firebase local persistence
  - Notificaciones push (opcional)
- **Beneficio:** Experiencia app-like, usable offline parcialmente.

### 15. Componentes UI Reutilizables (Design System)
- **Situación actual:** Estilos inline y componentes aislados sin sistema consistente.
- **Propuesta:** Crear Design System mínimo con Storybook.
- **Acciones:**
  - `npm install -D @storybook/react`
  - Migrar a componentes base: `Button`, `Input`, `Select`, `Modal`, `Table`, `Badge`, `Card`
  - Documentar variantes, props, y estados en Storybook
  - Usar Tailwind variants consistentes
- **Beneficio:** Consistencia visual, velocidad de desarrollo.

### 16. SEO y Meta Tags Mejorados
- **Situación actual:** Meta tags básicos en layout.tsx.
- **Propuesta:** SEO avanzado con structured data (JSON-LD), Open Graph, y sitemap dinámico.
- **Acciones:**
  - Agregar `next-sitemap` para sitemap.xml dinámico
  - JSON-LD para Organization, SportsEvent, LocalBusiness
  - Open Graph images generadas dinámicamente
  - Meta tags por página (títulos descriptivos, descripciones)
- **Beneficio:** Mejor posicionamiento en buscadores.

### 17. CI/CD para Web (GitHub Actions + Vercel)
- **Situación actual:** Deploys manuales a Vercel.
- **Propuesta:** Pipeline automatizado con preview environments.
- **Acciones:**
  - Crear `.github/workflows/web-ci.yml`:
    - `npm ci`, `npm run lint`, `npm run build`
    - Ejecutar tests unitarios y E2E
    - Deploy a Vercel Preview en PRs
    - Deploy a producción al merge a `main`
  - Usar Vercel CLI o GitHub Integration

### 18. Rendimiento: Code Splitting y Lazy Loading
- **Situación actual:** El bundle incluye todo el dashboard en un solo chunk.
- **Propuesta:** Lazy loading de secciones del dashboard con `next/dynamic`.
- **Acciones:**
  - `dynamic(() => import('./RevenueChart'), { ssr: false })`
  - Separar bundles por ruta de dashboard
  - Análisis de bundle con `@next/bundle-analyzer`
- **Beneficio:** Reducción de tiempo de carga inicial.

---

## 🟢 PRIORIDAD MEDIA: Ambos (Web + Backend)

### 19. Variables de Entorno y Secretos
- **Situación actual:** Firebase Admin SDK credentials commiteadas en el repo (archivo `.json`).
- **Propuesta:** Mover secretos a variables de entorno y `.env.local`.
- **Acciones:**
  - Agregar `firebase-adminsdk-*.json` a `.gitignore`
  - Usar `process.env.FIREBASE_ADMIN_CREDENTIALS` en web
  - Usar `process.env.TRANSBANK_API_KEY` en backend (ya configurable en settings de Firestore, pero reforzar)
  - Documentar en `.env.example`
- **Beneficio:** Seguridad crítica. Elimina exposición de credenciales.

### 20. Documentación de API y Tipos Compartidos
- **Situación actual:** Sin documentación de tipos entre frontend y backend.
- **Propuesta:** Paquete compartido de tipos TypeScript.
- **Acciones:**
  - Crear carpeta `shared-types/` en la raíz del monorepo
  - Definir interfaces: `UserProfile`, `Booking`, `Payment`, `Court`, `Tenant`
  - Ambos proyectos importan desde `shared-types/`
  - Publicar como workspace en package.json
- **Beneficio:** Consistencia de tipos, detección temprana de breaking changes.

### 21. Husky + Lint-Staged + Commitlint
- **Situación actual:** Sin hooks de pre-commit.
- **Propuesta:** Automatizar calidad de código en cada commit.
- **Acciones:**
  - `npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional`
  - Hook pre-commit: `lint-staged` (lint + format)
  - Hook commit-msg: `commitlint` (conventional commits)
  - `lint-staged.config.js`: `"*.{ts,tsx}": ["eslint --fix", "prettier --write"]`
- **Beneficio:** Código limpio y commits semánticos.

---

## 📊 Priorización Recomendada

| # | Mejora | Esfuerzo | Impacto | Prioridad |
|---|---|---|---|---|
| 8 | Testing Frontend | Alta | Muy Alto | Crítico |
| 1 | Testing Backend | Alta | Muy Alto | Crítico |
| 3 | Rate Limiting | Media | Alto | Alta |
| 19 | Secretos en .env | Baja | Crítico | Inmediata |
| 9 | Estados Loading/Error | Media | Alto | Alta |
| 12 | TanStack Query | Alta | Alto | Alta |
| 13 | Sentry (monitoreo) | Baja | Alto | Alta |
| 2 | Logging Estructurado | Media | Alto | Alta |
| 6 | Webhook Verification | Baja | Crítico | Alta |
| 17 | CI/CD Web | Media | Alto | Alta |
| 4 | CI/CD Backend | Media | Alto | Alta |
| 5 | Zod Schemas | Media | Medio | Media |
| 7 | Firestore Rules | Media | Alto | Media |
| 10 | Auditoría UI | Media | Medio | Media |
| 14 | PWA | Alta | Medio | Media |
| 15 | Design System | Alta | Medio | Media |
| 11 | i18n | Alta | Medio | Baja |
| 16 | SEO Avanzado | Media | Medio | Baja |
| 18 | Code Splitting | Baja | Medio | Baja |
| 20 | Tipos Compartidos | Media | Medio | Baja |
| 21 | Husky/Lint-Staged | Baja | Medio | Baja |

---

> **Nota:** Este documento es dinámico. A medida que trabajemos en las mejoras, actualizaremos el estado.
