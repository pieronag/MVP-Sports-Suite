# Política de Privacidad – MVP Sports Suite

**Última actualización: 19 de Mayo, 2026**
**Propiedad de MVP Sports Chile**

En **MVP Sports Chile**, nos tomamos muy en serio la privacidad y seguridad de la información de nuestros usuarios. Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos, procesamos y protegemos sus datos personales al utilizar el ecosistema **MVP Sports Suite**, el cual comprende nuestro sitio web (Dashboard de Gestión Administrativa) y nuestra aplicación móvil.

Esta política se redacta en estricto cumplimiento con la **Ley N° 19.628 sobre Protección de la Vida Privada** de la República de Chile y demás normativas aplicables en materia de protección de datos personales.

---

## 1. Datos Personales que Recopilamos

Recopilamos la información necesaria para proporcionar un servicio óptimo de gestión y reservas deportivas. La información recolectada se divide en las siguientes categorías:

### 1.1. Información de Registro e Identidad
- **Jugadores:** Nombre completo, RUT (opcional o requerido según facturación), dirección de correo electrónico, número de teléfono, avatar o foto de perfil.
- **Dueños de Recintos y Mánagers:** Nombre, RUT/RUT Empresa, correo electrónico, número de teléfono, cargo, credenciales de acceso y datos de contacto comercial.
- **Sincronización de Imagen Base64:** Las imágenes de perfil cargadas se serializan en codificación Base64 con prefijo MIME, sincronizándose de forma segura entre las colecciones de Firestore `users`, `staff` y Firebase Auth, optimizando la visualización rápida sin buckets públicos externos volátiles.

### 1.2. Datos de Geolocalización
- Recopilamos y procesamos datos de ubicación en tiempo real (GPS) del dispositivo del Jugador para calcular la distancia real en kilómetros (KM/M) hacia los recintos deportivos más cercanos en la sección de "Explora / Mapa". Esta ubicación se calcula con precisión balanceada en el dispositivo y no se almacena de forma histórica en nuestros servidores de manera permanente.

### 1.3. Datos Deportivos y de Gamificación
- Historial de reservas y partidos jugados.
- Métricas de rendimiento competitivo, nivel de puntos de experiencia (XP), badges (insignias) y rango competitivo (sistema de nivel ELO).
- Membresías de equipos (Squads) creados y estadísticas de legiones.

### 1.4. Datos de Comunicación Interna (Chat)
- Al utilizar el módulo de Squads (Equipos) en la aplicación móvil, procesamos los mensajes enviados a través del **Chat Interno de Equipo** con la única finalidad de facilitar la coordinación de los partidos y la organización táctica de los jugadores.

### 1.5. Datos de Transacciones y Finanzas
- Guardamos registros de transacciones que incluyen el ID de la reserva (`bookingId`), fecha, hora, monto total, estado del pago (Aprobado, Pendiente, Devolución o No-Show) e identificadores de transacción provistos por Transbank.
- **Seguridad Bancaria:** MVP Sports Suite **no recopila ni almacena números de tarjetas de crédito o débito, códigos de seguridad (CVV) ni claves bancarias**. Todos los pagos en línea se procesan de forma externa y segura a través de **Transbank Webpay Plus** en un WebView in-app aislado y cifrado.

---

## 2. Finalidad del Tratamiento de Datos

Utilizamos la información recopilada para las siguientes finalidades:
1.  **Prestación del Servicio:** Facilitar la búsqueda, reserva progresiva de canchas y validación de acceso mediante escáner QR de reservas en sitio.
2.  **Operación del Dashboard:** Proveer a los recintos deportivos las herramientas de Master Calendar, administración de canchas, control operativo del staff, liquidaciones y auditorías.
3.  **Sistema de Clasificación Competitiva (ELO/XP):** Calcular los rankings globales, el progreso y evolución competitiva del jugador para su Ficha Deportiva Digital.
4.  **Procesamiento de Reembolsos y Devoluciones:** Facilitar el cálculo del reembolso automático ante cancelaciones (con el descuento de la tasa de Transbank del 3%) y la emisión de comprobantes seguros ante reintegros fallidos.
5.  **Auditoría y Seguridad:** Registrar acciones administrativas mediante un historial inmutable de cambios (Audit Log) para prevenir fraudes y asegurar el correcto funcionamiento del software Multi-Tenant.
6.  **Facturación:** Gestionar el cobro de suscripciones de recintos (Free, Básico, Pro, Elite) y generar facturación electrónica integrada con el Servicio de Impuestos Internos (SII) de Chile (disponible para el plan Elite).

---

## 3. Intercambio de Información y Terceros

No vendemos, alquilamos ni comercializamos sus datos personales a terceros. Sus datos solo son compartidos en las siguientes situaciones estrictamente operativas:
- **Con los Recintos Deportivos (Tenants):** Compartimos el nombre, teléfono y estado de reserva del Jugador con el recinto deportivo específico donde se reservó la cancha para que puedan gestionar el acceso, el check-in y la ocupación en sitio.
- **Con Pasarelas de Pago (Transbank):** Enviamos la información básica de la reserva y montos a Transbank Webpay Plus para procesar las transacciones de pago seguro.
- **Con Proveedores de Infraestructura (Firebase / Vercel):** Los datos se almacenan en servidores seguros alojados en Google Cloud Platform (región recomendada de Sudamérica) y Next.js en Vercel, bajo estrictas normas de seguridad.
- **Con Entidades Fiscales:** En cumplimiento de obligaciones legales de facturación del recinto (SII Chile) en planes Elite.
- **Requerimiento Legal:** Cuando sea requerido por una orden judicial o autoridad pública en conformidad a la legislación chilena.

---

## 4. Retención de Datos y Anonimización

Mantenemos sus datos personales solo durante el tiempo que sea necesario para cumplir con las finalidades descritas en esta política, a menos que la ley exija un periodo de retención más extenso.

- **Baja de Jugador y Anonimización:** Si un Jugador decide eliminar definitivamente su cuenta desde la sección de configuración de perfil, la plataforma eliminará permanentemente sus credenciales de Firebase Auth y sus datos de perfil personal en Firestore (`/users/{uid}`). No obstante, los registros de transacciones financieras e historial de reservas **se conservarán en un estado estrictamente anonimizado** (sin nombres, teléfonos o correos legibles), asegurando que los reportes de ingresos históricos y auditorías contables de los recintos deportivos no se vean afectados por la eliminación.

---

## 5. Medidas de Seguridad de los Datos

Implementamos medidas técnicas, administrativas y físicas para proteger sus datos contra pérdidas, robos, accesos no autorizados, revelaciones o modificaciones:
- **Firestore Security Rules:** Reglas de seguridad estrictas a nivel de base de datos que validan los roles (SuperAdmin, Owner, Staff, Player) y aseguran que los inquilinos (Tenants) solo puedan leer y escribir información dentro de su propio alcance y que los jugadores solo accedan a sus propias reservas.
- **Encriptación:** Cifrado de datos en tránsito (HTTPS/SSL) y almacenamiento seguro.
- **Eliminación Segura de Prereservas:** Lógica de reservas diferidas en la pasarela de pago para evitar la retención innecesaria de "bloques fantasmas" en la base de datos si la transacción no se completa en Transbank.

---

## 6. Derechos del Usuario (ARCO)

De conformidad con la Ley N° 19.628, los usuarios tienen derecho a:
- **Acceso:** Conocer qué datos personales tenemos de usted.
- **Rectificación:** Solicitar la corrección de datos incorrectos o desactualizados.
- **Cancelación:** Solicitar la eliminación de sus datos cuando ya no sean necesarios para los fines que fueron recopilados (sujeto a las reglas de anonimización de transacciones).
- **Oposición:** Oponerse al tratamiento de sus datos para fines específicos.

Para ejercer cualquiera de estos derechos, o si tiene dudas sobre esta política, puede enviar una solicitud formal por escrito a soporte@mvpsports.cl.

---

## 7. Cambios en la Política de Privacidad

Nos reservamos el derecho de modificar esta Política de Privacidad en cualquier momento. Cualquier cambio significativo será notificado mediante la plataforma o por correo electrónico antes de que la modificación entre en vigencia. Le recomendamos revisar periódicamente esta página para estar al tanto de cualquier actualización.

---
**MVP Sports Chile - 2026**
*Comprometidos con la privacidad y el juego limpio.*
