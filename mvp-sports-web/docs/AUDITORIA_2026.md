# Auditoría de Permisos y Acciones — MVP Sports Suite

**Fecha:** 2026-08-03
**Alcance:** mvp-sports-web (Next.js 16) + mvp-sports-backend (Firestore rules + Cloud Functions)
**Motivo:** Fallos reportados en acciones de administrador (guardar, crear, borrar) y verificación integral de permisos.

---

## Resumen ejecutivo

El sistema NO tenía protección de rutas para `/dashboard/*` (no existe `middleware.ts` y el layout no validaba sesión). Ninguna página admin redirigía a `/login` salvo `profile`. Además, se encontró la **causa raíz** de los fallos de acciones admin: los **custom claims del token** (`request.auth.token.role`) tenían prioridad sobre el rol real de Firestore en las reglas, por lo que un claim obsoleto bloqueaba todas las escrituras de administración.

Se corrigieron los problemas críticos relacionados con permisos de administrador. El resto de hallazgos quedan documentados con severidad y recomendación.

---

## 🔴 CRÍTICO — Corregido en esta auditoría

### 1. Custom claim obsoleto bloqueaba acciones admin (CAUSA RAÍZ)
- **Archivo:** `mvp-sports-backend/firestore.rules` (función `getRole`)
- **Problema:** Las reglas leían `request.auth.token.role` **primero**. `owners/api/route.ts:23` establece el claim `{ role: 'owner' }` al crear un dueño. Si un usuario luego se promovía a `admin`/`superadmin` en Firestore (vía settings → "Elevar Privilegios" o `seed-admin`), el claim viejo del token seguía mandando en las reglas → `isSuperAdmin()` devolvía `false` → **todas las escrituras admin fallaban** (`settings/global`, creación/eliminación de tenants, facturas, payments, gamificación, billing).
- **Fix aplicado:** `getRole()` ahora usa **Firestore como fuente de verdad** (users → profiles → staff) y el claim del token solo como respaldo. Las promociones de rol surten efecto de inmediato.
- **Acción requerida:** Desplegar las reglas:
  ```
  cd mvp-sports-backend && firebase deploy --only firestore:rules
  ```

### 2. Sin protección de rutas `/dashboard/*`
- **Archivo:** `app/dashboard/layout.tsx` + nuevo `components/DashboardGuard.tsx`
- **Problema:** Cualquier usuario (o no autenticado) podía entrar a cualquier página admin por URL directa.
- **Fix aplicado:** Guarda por sesión (redirige a `/login`) y por rol según la ruta (redirige a `/dashboard` o `/player`). Mapa de rutas→roles alineado con la Sidebar.

### 3. Endpoint de owners sin autenticación
- **Archivo:** `app/dashboard/owners/api/route.ts`
- **Problema:** Cualquier persona podía crear usuarios Auth, **cambiar contraseñas de cualquiera** y eliminar cuentas vía `POST` (SDK admin).
- **Fix aplicado:** Verifica `Authorization: Bearer <ID token>` + rol `admin`/`superadmin` según Firestore (`services/server-auth.ts`). La página `owners/page.tsx` ahora envía el token.

### 4. Server action de staff sin autorización
- **Archivo:** `app/dashboard/staff/actions.ts`
- **Problema:** `updateStaffPassword(uid, password)` cambiaba la clave de cualquier usuario sin verificar quién llamaba.
- **Fix aplicado:** Exige ID token + rol de gestión (owner/manager/admin/superadmin). La página `staff/page.tsx` envía el token.

### 5. Rol no normalizado rompía UI y reglas
- **Archivo:** `context/AuthContext.tsx`
- **Problema:** El rol se tomaba tal cual de Firestore. Valores como `SuperAdmin`, `dueño` o `Admin` no coincidían con los checks de la app (`role === 'superadmin'`) y la Sidebar salía vacía.
- **Fix aplicado:** El rol se normaliza a minúsculas al cargar. `settings/complex` ahora hace fallback a `profiles` igual que el resto del sistema.

---

## 🟠 ALTO — Pendiente (recomendado corregir)

### 6. Escalamiento a superadmin por auto-escritura de `role`
- **Archivo:** `firestore.rules` L59-64 / L76-81
- **Problema:** Un usuario autenticado puede actualizar su propio documento `users`/`profiles` y cambiarse `role: 'superadmin'`. Las reglas no protegen el campo `role`.
- **Recomendación:** En las reglas, impedir que el propio usuario modifique el campo `role` (solo `isSuperAdmin()` puede cambiarlo):
  ```
  allow update: if ... && (isSuperAdmin() || !('role' in request.resource.data.diff(resource.data).affectedKeys()));
  ```

### 7. Endpoint `send-auth-email` devuelve el link de reset al caller anónimo
- **Archivo:** `app/api/send-auth-email/route.ts`
- **Problema:** Sin auth y expone `actionLink` (oobCode) en la respuesta → robo de token de reset / account takeover. Sin rate-limit (email bombing).
- **Recomendación:** Exigir token + rol, no devolver `actionLink` en la respuesta, y limitar por email.

### 8. Webpay: pagos rechazados aprobados y montos sin reconciliar
- **Archivo:** `app/api/webpay/commit/route.ts` (L65) y `app/api/webpay/create/route.ts`
- **Problema:** `if (result.vci === "TSY" || result.response_code === 0)` aprueba transacciones declinadas; `create` no valida el monto contra el precio real de la reserva ni la autenticación.
- **Recomendación:** Aprobar solo con `response_code === 0`, validar `amount` contra `bookings/{id}.totalPrice`, y exigir token del pagador.

### 9. Reservas "pagadas" forjables desde el cliente
- **Archivo:** `services/player/bookingService.ts` (create/update genéricos) + reglas de `bookings`
- **Problema:** El cliente puede fijar `paymentStatus: 'paid'`, `totalPrice: 0`, etc. Las reglas no hacen whitelist de campos.
- **Recomendación:** Restringir campos en reglas; el `paymentStatus: 'paid'` solo debe poder escribirlo el backend/función.

### 10. Fuga de credenciales Transbank al cliente
- **Archivo:** `services/player/venueService.ts` (`processTenantData` L57)
- **Problema:** `getVenues()`/`getVenueById()` devuelven el doc completo del tenant incluyendo `transbankApiKey`/`transbankCommerceCode`.
- **Recomendación:** Sanitizar el documento para no exponer claves de pago.

### 11. `incrementCouponUsage` denegado por reglas → cupones reutilizables ilimitadamente
- **Archivo:** `services/player/couponService.ts` + reglas de `coupons`
- **Problema:** El incremento de uso lo bloquean las reglas para jugadores; `usageLimit` nunca se aplica.
- **Recomendación:** Mover el incremento a una Cloud Function o permitir solo actualizar el contador en reglas.

### 12. Torneos sin `ownerId` editables por cualquiera
- **Archivo:** `app/dashboard/tournaments/page.tsx` L182,244,255,311
- **Problema:** Los torneos sin `ownerId` son visibles/editables/borrables por cualquier usuario logueado.
- **Recomendación:** Re-verificar propiedad antes de editar/borrar.

### 13. Email de bienvenida nunca se enviaba (401)
- **Archivo:** `components/landing/RegistrationModal.tsx` (L444) vs `app/api/send-email/route.ts`
- **Problema:** El modal llamaba `/api/send-email` sin `Authorization` → siempre 401.
- **Fix aplicado en esta auditoría:** Se agrega el header con el ID token del usuario recién creado.

---

## 🟡 MEDIO / BAJO — Pendiente

| # | Hallazgo | Archivo | Recomendación |
|---|----------|---------|---------------|
| 14 | Páginas admin con escrituras sin validación de rol en el cliente | tenants, users, invoices, reports, feedback, academy, marketing/coupons, manual-booking | Cubierto en parte por la nueva guarda de rutas; reforzar validación de rol en handlers |
| 15 | `gamification` escribe `settings/global` sin chequear rol | `app/dashboard/gamification/page.tsx` | Cubierto por la guarda de rutas (solo admin/superadmin) |
| 16 | `reports/page.tsx` y `settings/page.tsx` usaban fallbacks falsos de rol en auditoría (`role || 'admin'`) | reportes/settings | Corregido: ahora `'sin-rol'` |
| 17 | `send-email` permite a cualquier autenticado enviar a cualquier destinatario | `app/api/send-email/route.ts` | Validar que `email` pertenezca al usuario autenticado |
| 18 | Inyección de HTML en plantillas de email | `send-email` y `send-auth-email` | Escapar variables interpoladas |
| 19 | Cuenta de servicio local revocada/expiró | `mvp-sports-chile-firebase-adminsdk-*.json` (gitignored) | Regenerar key en Firebase console; está en `.gitignore` (no se comitea) |
| 20 | Página `manual-booking` huérfana (sin enlace) | `app/dashboard/manual-booking/page.tsx` | Decidir si se enlaza o se elimina |
| 21 | Roles en español (`dueño`, `gestor`) vs inglés (`owner`, `manager`) | `users/analytics` vs `owners` | Unificar valores de rol en datos |
| 22 | Lint falla por cientos de `no-explicit-any` | todo el proyecto | Limpieza separada de tipos |
| 23 | Reglas permiten `users`/`profiles` leer PII de cualquier usuario | `firestore.rules` (read abierta a autenticados) | Restringir lectura de campos sensibles (rut, email, phone) |
| 24 | `webpay/test` expone stack trace y sin auth | `app/api/webpay/test/route.ts` | Deshabilitar en producción |

---

## Archivos modificados (fixes aplicados)

| Archivo | Cambio |
|---------|--------|
| `mvp-sports-backend/firestore.rules` | `getRole()`: Firestore es fuente de verdad del rol (custom claim solo respaldo) |
| `context/AuthContext.tsx` | Normalización del rol a minúsculas |
| `components/DashboardGuard.tsx` (nuevo) | Guarda de autenticación + rol por ruta del dashboard |
| `app/dashboard/layout.tsx` | Envuelve el layout con `DashboardGuard` |
| `services/server-auth.ts` (nuevo) | Helpers de verificación de token + rol (admin/manager) |
| `app/dashboard/owners/api/route.ts` | Requiere token + rol admin/superadmin |
| `app/dashboard/owners/page.tsx` | Envía ID token en las 3 llamadas a la API |
| `app/dashboard/staff/actions.ts` | `updateStaffPassword` exige token + rol de gestión |
| `app/dashboard/staff/page.tsx` | Envía ID token a la server action |
| `components/landing/RegistrationModal.tsx` | Agrega `Authorization` header al enviar email de bienvenida |
| `app/dashboard/settings/complex/page.tsx` | Fallback de rol a `profiles` (consistencia) |
| `app/dashboard/settings/page.tsx` | Auditoría sin fallback falso de rol |
| `app/dashboard/reports/page.tsx` | Auditoría sin fallback falso de rol |

## Pasos obligatorios para el dueño del proyecto

1. **Desplegar reglas de Firestore** (crítico para que los fixes surtan efecto):
   ```bash
   cd mvp-sports-backend
   firebase deploy --only firestore:rules
   ```
2. **Verificar el rol del admin en Firestore:** el documento `users/{uid}` (o `profiles/{uid}`) debe tener `role: 'superadmin'` o `'admin'` en minúsculas. Si no, correr `npm run seed-admin` o usar Settings → Staff → Elevar Privilegios.
3. **Renovar la cuenta de servicio local** (`FIREBASE_PRIVATE_KEY` en `.env.local`): la key del JSON presente está revocada/expiró. Regenerar en https://console.firebase.google.com/iam-admin/serviceaccounts/project/_/settings/serviceaccounts/adminsdk.
4. **Tras deploy**, probar: login admin → /dashboard/settings → Guardar cambios; /dashboard/tenants → crear/borrar; /dashboard/owners → crear dueño; /dashboard/staff → cambiar clave.
