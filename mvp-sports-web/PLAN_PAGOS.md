# Plan de Pagos — MVP Sports Suite

## Estado Actual

### Web Frontend (`mvp-sports-web`)

- [x] Pantalla checkout con resumen de reserva y botón de pago
- [x] Input de cupón de descuento (Firestore `coupons` collection)
- [x] Selector de equipo para reservas grupales
- [x] Flujo de redirección: frontend → Cloud Function → Transbank
- [x] Pantalla ticket post-pago con QR y estado
- [x] Manejo de devoluciones (refund) vía Cloud Function `refundBookingPayment`

### App Móvil (`mvp-sports-app`)

- [x] Pantalla checkout con resumen y pago
- [x] WebView para flujo Webpay
- [x] Deep links post-pago

### Pendiente

- [ ] Inicializar Cloud Functions con SDK Transbank
- [ ] Función `createWebpayTransaction` (callable)
- [ ] Función `commitWebpayTransaction` (HTTP, actúa como returnUrl)
- [ ] Colección `payments` en Firestore con reglas de seguridad
- [ ] Pantallas success/failure post-pago

## Stack de Pagos

- **Pasarela principal:** Transbank Webpay Plus
- **Pasarela secundaria:** Mercado Pago (según tenant)
- **Moneda:** CLP
- **Comisión plataforma:** Configurable por admin (settings globales)

## Flujo

1. Usuario completa wizard de reserva en `/player/clubes/[id]`
2. Redirige a `/player/checkout` con datos vía query params
3. Usuario ingresa cupón (opcional) y selecciona equipo (opcional)
4. Cloud Function crea transacción en Transbank → devuelve URL + token
5. Frontend genera form POST y envía a Transbank
6. Transbank procesa y redirige a returnUrl (Cloud Function)
7. Cloud Function confirma (`commit`) y actualiza Firestore
8. Usuario llega a `/player/ticket` con QR y resumen
