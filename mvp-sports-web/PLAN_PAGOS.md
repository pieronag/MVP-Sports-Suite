# 💳 Plan de Implementación del Proceso de Pago Completo (Transbank - Webpay Plus)

Este documento detalla el paso a paso para completar al 100% el sistema de pagos en **MVP Sports Suite**, asegurando seguridad, consistencia de datos en Firebase y una experiencia de usuario fluida, utilizando exclusivamente **Transbank (Webpay Plus)**.

---

## 🏗️ Fase 1: Configuración de Base de Datos y Seguridad (Firestore)

### 1.1 Modelo de Datos en Firestore
Debemos crear una nueva colección `payments` (o `transactions`) para llevar el registro auditable de todo pago, independiente de las reservas.

**Colección:** `payments`
```json
{
  "id": "pay_123456",
  "userId": "user_id_fk",
  "referenceId": "booking_id_o_tournament_id", // A qué corresponde el pago
  "referenceType": "booking", // o 'tournament', 'academy'
  "amount": 15000,
  "currency": "CLP",
  "status": "pending", // 'pending', 'approved', 'rejected', 'aborted'
  "gateway": "transbank",
  "token_ws": "01ab...cdef", // Token único que retorna Transbank al iniciar
  "buyOrder": "order_12345", // Orden de compra generada por nosotros
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 1.2 Reglas de Seguridad (`firestore.rules`)
Debemos asegurar que nadie pueda modificar los pagos de forma manual desde el cliente.
Añadir a `firestore.rules`:
```javascript
match /payments/{paymentId} {
  // El usuario solo puede leer sus propios pagos
  allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
  // Solo se pueden crear/actualizar pagos internamente (Cloud Functions)
  allow create, update, delete: if false; 
}
```

---

## ⚙️ Fase 2: Lógica de Backend (Firebase Cloud Functions)

A diferencia de otras pasarelas, **Transbank requiere que tú confirmes ("commit") el pago** una vez que el usuario vuelve a tu sitio web. Todo esto se debe hacer desde el backend por seguridad.

### 2.1 Configuración del Proyecto de Funciones
1. En un directorio independiente (ej. `functions`), inicializar Cloud Functions: `firebase init functions`.
2. Instalar el SDK oficial de Transbank: `npm install transbank-sdk`.
3. Configurar las variables de entorno de producción para el `COMMERCE_CODE` y `API_KEY` (en desarrollo se usan las de integración que trae el SDK por defecto).

### 2.2 Función 1: `createWebpayTransaction` (Callable)
- **Qué hace:** El frontend la llama cuando el usuario hace clic en "Pagar".
- **Lógica:**
  1. Recibe el `referenceId` (ej. ID de la reserva).
  2. Valida en Firestore que la reserva exista y obtiene el monto real.
  3. Usa el SDK: `new WebpayPlus.Transaction().create(buyOrder, sessionId, amount, returnUrl)`
  4. Crea un documento en la colección `payments` guardando el `token_ws` con estado `pending`.
  5. Retorna al Frontend la `url` y el `token` para que este lo envíe a Transbank.

### 2.3 Función 2: `commitWebpayTransaction` (HTTP Request)
- **Qué hace:** Endpoint que actúa como `returnUrl` al que Transbank redirige al usuario después de pagar.
- **Lógica:**
  1. Recibe el `token_ws` vía POST (o GET si el usuario abortó).
  2. Usa el SDK para confirmar el pago: `new WebpayPlus.Transaction().commit(token_ws)`.
  3. Transbank responde si el pago fue exitoso o no.
  4. Actualiza el documento en `payments` (ej. a `approved`).
  5. **CRÍTICO:** Si es exitoso, actualiza la reserva (`bookings`) a `confirmed`.
  6. Redirige al navegador del usuario a la pantalla final de la web: `https://tu-web.com/checkout/success` o `/failure`.

---

## 💻 Fase 3: Integración Frontend Web (`mvp-sports-web`)

### 3.1 Flujo de Redirección hacia Transbank
Transbank no usa una simple URL, **requiere enviar un formulario POST** para iniciar el pago.
1. Al hacer clic en "Pagar", llamas a la Cloud Function `createWebpayTransaction`.
2. La función devuelve una `url` y un `token`.
3. El frontend debe crear un `<form>` dinámico en el DOM, asignarle el `action={url}`, añadir un `<input type="hidden" name="token_ws" value={token} />` y hacer `.submit()` programáticamente.

### 3.2 Pantallas de Retorno (Success / Failure)
- `app/checkout/success/page.tsx`: Muestra mensaje de éxito y un botón a "Mis Reservas".
- `app/checkout/failure/page.tsx`: Muestra que el pago falló o fue cancelado, con botón a "Reintentar".

---

## 📱 Fase 4: Integración Frontend App Móvil (`mvp-sports-app`)

### 4.1 Flujo In-App con Webview
El flujo de Webpay es un poco particular en móviles porque requiere navegar a un banco.
1. Se invoca `createWebpayTransaction` para obtener `url` y `token`.
2. En lugar del WebBrowser tradicional, se recomienda usar `react-native-webview` para inyectar un HTML con el formulario POST y auto-enviarlo.
3. El WebView navegará a Transbank.
4. Cuando el usuario termina, Transbank navega a la URL de retorno (la Cloud Function `commitWebpayTransaction`).
5. Esa función, al terminar de procesar, hace una redirección a un **Deep Link** (ej. `mvpsports://checkout/success`).
6. La app intercepta este Deep Link, cierra el WebView y muestra la pantalla nativa de éxito.

---

## 🧪 Fase 5: Pruebas y Pase a Producción

1. **Entorno de Integración:** 
   - El SDK de Transbank viene con credenciales de prueba (`WebpayPlus.configureForTesting()`).
   - Usa las tarjetas de crédito de prueba de Transbank para probar pagos exitosos, sin cupo y rechazos.
2. **Paso a Producción:**
   - Una vez el sistema funcione perfecto en test, se configuran las credenciales en vivo en Cloud Functions: `WebpayPlus.configureForProduction(commerceCode, apiKey)`.

---
## Resumen de Tareas Inmediatas:
- [ ] 1. Inicializar Firebase Cloud Functions (`functions`) e instalar `transbank-sdk`.
- [ ] 2. Actualizar `firestore.rules` con las reglas de lectura de `payments`.
- [ ] 3. Desarrollar las dos funciones de backend (`createWebpayTransaction` y `commitWebpayTransaction`).
- [ ] 4. Crear el componente en React que autogenera el Form POST hacia Transbank.
