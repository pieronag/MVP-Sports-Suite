# Términos y Condiciones de Uso – MVP Sports Suite

**Última actualización: 19 de Mayo, 2026**
**Propiedad de MVP Sports Chile**

Bienvenido a **MVP Sports Suite**, una plataforma integral de gestión deportiva digital y reserva de recintos, operada bajo la modalidad Software as a Service (SaaS) Multi-Tenant. Estos Términos y Condiciones (en adelante, los "Términos") regulan el acceso y uso del ecosistema MVP Sports Suite, el cual incluye el sitio web (Dashboard Administrativo Next.js) y la aplicación móvil (Expo/React Native), disponibles para recintos deportivos, administradores y jugadores finales en el territorio de la República de Chile.

Al registrarse, acceder o utilizar cualquier parte de la plataforma, usted acepta de manera expresa y sin reservas estar sujeto a estos Términos. Si no está de acuerdo con alguna de las disposiciónes aquí establecidas, no deberá utilizar ni registrarse en la plataforma.

---

## 1. Definiciones y Roles en el Ecosistema

Para efectos de una correcta interpretación, se definen los siguientes roles y términos dentro de la plataforma:
- **MVP Sports Chile (La Plataforma / SuperAdmin):** Propietario y operador del software, encargado de la mantención del código, soporte global, facturación SaaS y configuración general del ecosistema.
- **Dueño de Recinto (Owner / Tenant):** Persona natural o jurídica que contrata el servicio SaaS de MVP Sports Suite para gestionar complejos deportivos, configurar canchas, definir horarios y tarifas, crear torneos, configurar academias y gestionar su personal.
- **Mánager / Staff (Operadores):** Personal designado por el Dueño del Recinto para administrar el día a día operativo en el recinto, incluyendo la validación física del acceso de jugadores, registro manual de reservas, cobros directos presenciales e inicio de partidos en cancha.
- **Jugador (Player / Usuario Final):** Persona natural registrada en la aplicación móvil que busca recintos deportivos, realiza reservas de canchas, participa en torneos/academias, crea o se une a legiones de equipos (Squads) y visualiza sus estadísticas competitivas (XP, ELO, Tiers).
- **Recinto:** Complejo o recinto deportivo asociado a la plataforma.

---

## 2. Relación Contractual y Modelo SaaS (Dueños de Recintos)

### 2.1. Planes de Suscripción y Limitaciones (Feature Gating)
El acceso de los Recintos al Dashboard Administrativo está sujeto al plan contratado:
- **Free:** Comisión estándar del 8% sobre reservas online transaccionadas. Limitación a sede única y exclusión de herramientas avanzadas de marketing/cupones e integraciones de APIs.
- **Básico:** Comisión del 7% sobre reservas transaccionadas y funcionalidades esenciales de gestión.
- **Pro:** Comisión del 6% sobre reservas transaccionadas y acceso a reportes operativos medios.
- **Elite:** Comisión del 5% sobre reservas transaccionadas. Habilita la totalidad de características premium, incluyendo:
  - Creación ilimitada de cupones y campañas de marketing.
  - Integración de facturación electrónica directa con el Servicio de Impuestos Internos (SII) de Chile.
  - API de pasarela de pago configurada de forma independiente.
  - Gestión Multi-Sede bajo una misma identidad digital.

### 2.2. Modalidad de Facturación y Cobros Mensuales
Los fondos recaudados por reservas pagadas en línea ingresarán íntegramente de manera directa a la cuenta comercial del Dueño del Recinto. La plataforma **no** realiza retenciones automáticas por transacción. 
En su lugar, el día **1 de cada mes**, MVP Sports emitirá un cobro o factura correspondiente a la suma de todas las comisiones generadas por el uso de la plataforma durante el **mes calendario inmediatamente anterior** (ej. el 1 de julio se cobra el uso completo de junio). El recinto cuenta con un plazo máximo de pago de entre 5 a 10 días corridos sin acceso a crédito interno. El no pago facultará a la plataforma a suspender temporalmente el servicio.

---

## 3. Registro y Gestión de Cuentas

### 3.1. Veracidad de la Información
Todos los usuarios (Dueños, Mánagers y Jugadores) declaran que toda la información proporcionada al registrarse (nombre, RUT, correo, teléfono y perfiles de recinto) es verídica, exacta y actualizada.

### 3.2. Cuentas de Jugador e Identidad Deportiva
La cuenta de Jugador es personal e intransferible. Al registrarse, se asocia una tarjeta digital de jugador (**MVP Card**) con un sistema de gamificación basado en XP (puntos de experiencia) y rango competitivo (ELO). Está prohibido alterar de forma fraudulenta los puntajes o suplantar identidades deportivas de terceros.

### 3.3. Eliminación Definitiva de Cuentas (Baja del Servicio)
Cualquier Jugador puede solicitar la eliminación definitiva de su cuenta directamente desde la aplicación móvil.
- **Efecto de la eliminación:** Se borrarán de forma inmediata e irreversible las credenciales de Firebase Auth y el perfil personal del usuario (`/users/{uid}`).
- **Auditoría e Historial Contable:** Por motivos de auditoría fiscal, contabilidad de los recintos y consistencia financiera, el historial de reservas asociadas a dicha cuenta **no se eliminará**, sino que se conservará bajo un estado de **anonimización absoluta** para no comprometer el balance contable de los recintos deportivos ni de la plataforma.

---

## 4. Proceso de Reservas y Pasarela de Pagos (Jugadores)

### 4.1. Reserva de Canchas (Wizard Mode)
Los jugadores reservan bloques horarios a través de un flujo estructurado de tres pasos (Selección de Deporte, Selección de Cancha y Selección de Fecha/Hora). Las reservas se sincronizan en tiempo real con el calendario maestro de la administración, garantizando 0 sobre-reservas en el sistema.

### 4.2. Pagos en la Plataforma
La plataforma cuenta con dos modalidades de pago:
1.  **Pago Online:** Transaccionado a través de **Transbank Webpay Plus** embebido directamente en la aplicación móvil en un WebView seguro. La plataforma no almacena números de tarjeta de crédito o débito físicos en base de datos Firestore, eliminando riesgos de vulneración o filtración de datos financieros.
2.  **Pago en Recinto:** Si el recinto no dispone de una pasarela de pago activa en línea o la plataforma ha inhabilitado temporalmente la integración por razones operativas, el jugador seleccionará exclusivamente "Pagar en Recinto". En este caso, el pago se realiza de manera presencial (efectivo, transferencia o POS físico) al personal del recinto antes de ingresar a jugar.

---

## 5. Políticas de Cancelación y Reembolsos

Las reservas abonadas en línea a través de la pasarela de pagos oficial están sujetas a reglas estrictas de cancelación y reembolso para salvaguardar la ocupación del recinto y evitar perjuicios económicos a los dueños:

### 5.1. Regla de la Ventana de 4 Horas (Punto de Corte)
- **Cancelaciones con más de 4 horas de anticipación:** El Jugador tiene derecho a cancelar de manera voluntaria la reserva y recibir el reembolso de su dinero. No obstante, para proteger las finanzas operativas del recinto de los costos financieros de procesamiento de Transbank, **se descontará de forma automática una comisión del 3%** (correspondiente al arancel de Transbank + IVA). El remanente (97% del total) será retornado al medio de pago original.
- **Cancelaciones con menos de 4 horas de anticipación:** Si quedan menos de 4 horas para el inicio programado de la reserva, el bloque se considera "no cancelable" y el monto pagado **no será devuelto bajo ningún escenario**, quedando retenido por el recinto deportivo como compensación por bloqueo tardío.

### 5.2. Bloqueo Absoluto por Check-In
Una vez realizado el Check-In físico en el recinto (escaneo de código QR o validación manual por parte del Mánager en sitio), la reserva pasa a estado "En Juego/Activa" y queda **inmediatamente bloqueada de toda posibilidad de cancelación o devolución**, sin importar el tiempo restante.

### 5.3. Contingencia y Reembolsos Manuales por Falla de Pasarela
En caso de que la reversa automática a través de la API física de Transbank falle por problemas del banco emisor, expiración de tokens seguros o bloqueos temporales de pasarela:
1.  La plataforma priorizará liberar el horario en el calendario de la cancha y registrar la reserva bajo el estado de `status: 'cancelled'` y `paymentStatus: 'refund_failed'`.
2.  La aplicación móvil generará un **Comprobante de Devolución Fallida** digital único con formato `MVP-REFUND-[ID_RESERVA_8]`.
3.  El Jugador deberá **solicitar la devolución de forma manual** presentándose o contactando directamente a la administración del recinto (quien cuenta con el dinero capturado originalmente). El recinto deportivo tiene la **obligación contractual** de realizar la transferencia o reintegro manual del dinero retenido tras validar el identificador único seguro entregado en la aplicación móvil.

---

## 6. Política de No-Show (Inasistencia)

El control operativo del acceso a las canchas está regulado de forma automática por un validador de inasistencias sincronizado bajo la hora local de Chile continental:

### 6.1. Definición de No-Show
Toda reserva que alcance su hora de inicio programada y no cuente con una marca de asistencia física válida en el sistema (Check-In no realizado) será marcada bajo el estado de **INASISTENCIA (No-Show)** de forma inmediata y automática por el motor de limpieza de la plataforma.

### 6.2. Consecuencias Financieras
- **Reservas Pagadas Online (Transbank):** Si una reserva pagada en línea incurre en No-Show, el pago es **retenido en su totalidad** en favor del recinto. La plataforma marcará la reserva como `PAGO RETENIDO` o `SEÑA RETENIDA`, inhabilitando cualquier reclamo de reembolso o reprogramación de bloque.
- **Reservas Impagas (Pago en Recinto):** Si una reserva sin abono previo incurre en No-Show, la reserva es automáticamente **cancelada por inasistencia**, liberando el cupo para otros usuarios. La plataforma registrará el historial negativo en el perfil del jugador, lo que podría condicionar futuras reservas bajo la modalidad de pago en destino si el comportamiento de inasistencia es recurrente.

---

## 7. Responsabilidades y Limitaciones de Responsabilidad

### 7.1. Responsabilidad por el Estado del Recinto
MVP Sports Chile es un facilitador tecnológico (SaaS). El estado físico de las canchas, la seguridad dentro del complejo deportivo, la iluminación, el comportamiento del personal en sitio y cualquier accidente o daño que ocurra dentro de las dependencias de los recintos es de **exclusiva responsabilidad de los dueños del recinto y sus administradores**. MVP Sports Chile no asume responsabilidad alguna por daños personales o materiales.

### 7.2. Interrupción del Servicio
Si bien la plataforma cuenta con una arquitectura de alta disponibilidad en Firebase y Next.js, no se garantiza que el servicio funcione de forma ininterrumpida o libre de errores imprevistos. Los dueños y mánagers cuentan con herramientas locales y planes de contingencia para registros manuales y visualizaciones de agenda offline en caso de cortes de red.

---

## 8. Modificaciones de los Términos

MVP Sports Chile se reserva el derecho de modificar estos Términos en cualquier momento para reflejar cambios legales, técnicos o comerciales en el ecosistema. Las actualizaciones serán publicadas en el sitio web y notificadas a través de la aplicación móvil. El uso continuo de la plataforma con posterioridad a dichas actualizaciones constituye la aceptación tácita de los nuevos Términos.

---

## 9. Jurisdicción y Ley Aplicable

Estos Términos y Condiciones se rigen por las leyes vigentes de la República de Chile. Cualquier conflicto, discrepancia o reclamación derivada del uso de la plataforma o de la interpretación de este documento será sometido a la jurisdicción de los Tribunales Ordinarios de Justicia de la ciudad de Santiago de Chile.

---
Para consultas legales o soporte técnico, contáctese con soporte@mvpsports.cl.
