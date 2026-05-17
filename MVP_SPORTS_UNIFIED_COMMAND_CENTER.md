# 🏆 MVP SPORTS SUITE: UNIFIED COMMAND CENTER (V16.0)
### Manual de Operaciones y Especificación Técnica Industrial
**Propiedad de MVP SPORTS CHILE - 2026**

---

## 🏗️ 1. FILOSOFÍA DE INGENIERÍA: EXTREME ELITE™
Este ecosistema representa la **cúspide de la gestión deportiva digital**, transformando complejos deportivos en centros operativos de alto rendimiento. Bajo la arquitectura **Multi-Tenant SaaS**, el sistema elimina la fricción operativa mediante interfaces de alta densidad (**Executive Slim UI**), motores de precios dinámicos y una infraestructura móvil de baja latencia impulsada por Expo y React Native.

### 🎨 Principios de Diseño Industrial:
*   **Executive Slim UI:** Grillas de alta densidad para supervisión operativa rápida sin fatiga cognitiva.
*   **Zero-Friction Booking:** Flujos progresivos con lógica de auto-selección inteligente de deportes.
*   **High-Contrast Platinum:** Paleta de colores optimizada para entornos profesionales (Negro Puro, Platinum Gray y Azure Blue).
*   **Real-Time Synchronization:** Motor de base de datos proactivo con 0 sobre-reservas garantizadas.

---

## 🏬 2. MÓDULO SUPER-ADMIN & CONTROL GLOBAL (ELITE COMMAND)
*El nivel de acceso más alto para la gestión del ecosistema completo.*

*   **Global Sales Intel:** Visualización de GMV total y gestión de comisiones del 8% automatizadas.
*   **Tenant Operations Center:** Dashboard de control para el alta y baja de recintos deportivos (Tenants).
*   **Global User Statistics:** Analytics de población de jugadores, rankings globales y mapas de calor por ubicación.
*   **System Audit Log:** Historial técnico de cambios inmutables por usuario para seguridad forense.
*   **Gamification Engine Config:** Central de mando para definir niveles de XP, reglas de tiers y recompensas globales.
*   **Billing & SaaS Ledger:** Gestión de facturación por servicios SaaS y estados de suscripción de recintos.

---

## 🏟️ 3. MÓDULO DUEÑO DE RECINTO (OWNER DASHBOARD)
*Gestión táctica y financiera para propietarios de complejos deportivos.*

*   **Agenda & Master Calendar:** Control absoluto de bloques horarios por cancha con filtros por deporte.
*   **Financial Hub Pro:** Métricas de ocupación, ingresos diarios y deudores en una sola vista HUD.
*   **Tournament Motor:** Creación y gestión de ligas, torneos de eliminación directa y fases de grupos.
*   **Sports Academy:** Gestión de clases, escuelas deportivas, listas de alumnos y profesores.
*   **Asset Management:** CRUD de canchas con especificaciones técnicas (Superficie FIFA, Iluminación LED, Outdoor).
*   **Marketing & Coupons:** Generación de códigos promocionales dinámicos con límites de uso y fechas de expiración.
*   **Staff Permissions Matrix:** Gestión de empleados con asignación de roles (Manager/Operador) y accesos específicos.
*   **Public Profile Customizer:** Gestión de imágenes (Base64), geolocalización real y servicios del recinto (Duchas, WiFi, Parking).

---

## 🛠️ 4. MÓDULO MANAGER & OPERATIVO (STAFF HUD)
*Herramientas críticas para el personal en sitio.*

*   **Operational Dashboard:** Vista simplificada con foco exclusivo en la ocupación del turno actual. Incorpora la grilla de alta densidad de próximas reservas ordenadas cronológicamente de forma descendente, con desglose de deporte, monto total cobrado y señas para pagos parciales.
*   **Tunnel View QR Validator:** Escáner inmersivo de alta velocidad con cámara aislada en recuadro dinámico (proporción vertical `70vh` por altura) sobre fondo negro puro, tasa de procesamiento a 30 FPS, optimización de exposición y rango de interés de escaneo optimizado al 80% para pantallas móviles brillantes.
*   **Check-in Visual Badges:** Sistema de estados premium de afluencia (Acceso OK / Anulada) mediante píldoras translúcidas de color esmeralda y rojo con iconos de alta resolución (`ShieldCheckIcon`, `NoSymbolIcon`) y difuminados de opacidad/escala de grises automáticos para filas no operativas.
*   **Manual Booking Override:** Capacidad para realizar reservas manuales o bloqueos técnicos preventivos.
*   **Feedback Monitor:** Visualización y respuesta a opiniones de clientes en tiempo real.

---

## 📱 5. MOBILE APP EXPERIENCE (ELITE PLAYER)
*La interfaz maestra para el usuario final diseñada para máxima conversión.*

*   **Explore & Map Hub:** Buscador dinámico "Pricing-Aware" con cálculo de distancia real en KM.
*   **Wizard Mode Booking:** Proceso guiado de 3 pasos (Deporte > Cancha > Fecha) con checkout integrado.
*   **Direct Payment Checkout:** Flujo de pago online simplificado a través de **Transbank Webpay Plus** directo en un WebView in-app. Elimina la fricción de enrolamiento previo de tarjetas (Oneclick) cobrando al instante con tarjetas de débito/crédito.
*   **Gateway Gating & Smart Filter:** Si el dueño del recinto (`tenantId`) no tiene activa o configurada su API de pagos (ej: faltan llaves Transbank o switch `paymentApiActive: false`), el app móvil restringe automáticamente el checkout a mostrar **únicamente** la opción **"Pagar en el Recinto"** (pago presencial/transferencia).
*   **Unified Transaction Ledger (Billetera V16.0):** Billetera digital re-diseñada con enfoque exclusivo en transparencia financiera. Remueve toda la interfaz de enrolamiento de tarjetas físicas para seguridad absoluta y presenta una **Matriz de Balance Ejecutivo** que separa dinámicamente el monto total de "Pago Online" (transaccionado vía Webpay Plus) de los "Pagos en Recinto" (por rendir presencialmente) para una contabilidad y conciliación impecable.
*   **MVP Card & Digital ID:** Identidad deportiva con nivel XP, Tier Badge y QR de acceso personal.
*   **Performance Analytics:** Dashboard táctico con Radar Charts de habilidades y evolución de rango ELO.
*   **Squad Legions (Teams):** Creación de legiones, reclutamiento de jugadores y desafíos entre equipos comunitarios.
*   **History & Active Passes:** Filtros rápidos para gestionar reservas pasadas y tickets activos.

---

## ⚙️ 6. AVANCED TECHNICAL ENGINES (CORE LOGIC)
*   **Pricing Matrix Algorithm:** Cálculo dinámico basado en Deporte + Hora (Pico/Valle) + Día de la semana.
*   **SaaS Feature Gating:** Bloqueo/desbloqueo de módulos según nivel de suscripción del recinto (Free vs Elite).
*   **ELO Algorithm (V5.0):** Cálculo de reputación y nivel competitivo basado en el historial de partidos.
*   **Webpay Plus Payment Pipeline:** Invocación segura mediante la Cloud Function `createWebpayTransaction` en la región `southamerica-west1` y captura de redirecciones móviles (`mvpdeportes://checkout/success` / `error`) para actualizar en tiempo real el pago a `approved` en Firestore y registrar el equipo o confirmar la reserva de cancha de manera instantánea.
*   **Base64 Image Pipeline:** Sincronización triple de perfiles de usuario (Firestore `users`, Firestore `staff` y Firebase Auth) estandarizado en codificación serializada Base64 con prefijo MIME, eliminando enlaces volátiles o problemas de caché inter-plataformas.
*   **Self-Staff Authorization Rules:** Reglas de seguridad en Firestore `/staff/{staffId}` optimizadas para habilitar a los administradores de recintos actualizar de forma ininterrumpida sus perfiles operativos sin depender de tokens heredados lentos.
*   **Multi-Sede Staff Logic:** Permite que un operario encuentre y gestione múltiples recintos bajo una sola identidad digital.
*   **Resend Email Notification Pipeline (V16.1):** Endpoint API de Next.js `/api/send-email` integrado y optimizado para ejecutarse en entornos serverless (Vercel). Envía automáticamente correos electrónicos de bienvenida premium utilizando plantillas HTML de alta fidelidad estilo dark-mode, con fallback seguro para desarrollo local si la variable `RESEND_API_KEY` no está configurada, previniendo fallos en el registro de usuarios.
*   **Hourly No-Show & Timeout Cron Engine (V16.2):** Endpoint API de Next.js `/api/cron/check-no-shows` automatizado en Vercel mediante `vercel.json` con programación horaria (`0 * * * *`). Analiza y actualiza automáticamente reservas impagas a `status: 'cancelled'` liberando la disponibilidad de las canchas en dos escenarios: (1) Inasistencia al iniciar la hora del partido (`paymentStatus: 'no-show'`), y (2) Abandono de pasarela de pago en reservas de tipo 'pending' tras 15 minutos de inactividad (`paymentStatus: 'failed'`).
*   **Player Account Control & Deletion Engine (V16.3):** Botones y modales interactivos de confirmación integrados en `perfil.tsx`. El botón "Cerrar Sesión" ahora activa un modal de validación táctil con advertencias y detalles de sesión, mientras que el botón "Eliminar Cuenta Definitivamente" despliega un modal de alta visibilidad (rojo peligro) que detalla de forma exhaustiva que se eliminarán las credenciales de Firebase Auth y el documento `/users/{uid}`, mientras que las reservas e historial de juego se conservarán de forma anónima para análisis contable y de auditoría de los dueños de recintos. Ejecuta de forma nativa la baja con control de reautenticación segura (`auth/requires-recent-login`).
*   **Tenant Load Reference Error Fix & Refresh (V16.4):** Se corrigió un error de referencia crítico (`ReferenceError: tenantRef is not defined`) en la página de administración de recintos web (`app/dashboard/tenants/page.tsx`). Al calcular y de-duplicar las valoraciones reales de cada complejo deportivo para sincronizarlas con Firestore, el código intentaba actualizar el documento utilizando la referencia `tenantRef` sin haberla declarado previamente, rompiendo la promesa asíncrona de carga global y dejando la sección web de recintos en blanco. Se declaró correctamente `tenantRef` utilizando `doc(db, "tenants", tenantId)` resolviendo el bloqueo de renderizado en el Dashboard. Adicionalmente, se unificó la barra de herramientas y filtros implementando exactamente el mismo diseño premium y el componente reutilizable `BotonAccion` de la sección de *Usuarios*, garantizando una consistencia visual de primer nivel a lo largo de toda la suite administrativa.
*   **Case-Insensitive Plan Mapping & Billing Fix (V16.5):** Se resolvió una inconsistencia crítica de planes en la pantalla de *Billing & Subscription* (`app/dashboard/billing-subscription/page.tsx`). Anteriormente, al cargar el listado de recintos vinculados al usuario, el código dependía estrictamente del campo `planId` de Firestore (el cual era inexistente en registros creados manualmente o legados, que solo almacenaban el valor en el campo `plan: "Elite"`). Al no haber coincidencia exacta de ID, el sistema aplicaba por defecto el plan `Básico` o `free` en la interfaz. Implementamos una búsqueda insensible a mayúsculas/minúsculas (`.toLowerCase()`) que compara el valor dinámico de `planId` o `plan` con la ID y el Nombre de los planes oficiales cargados globalmente, garantizando que el plan correcto (ej. `"Elite"`) se asigne y renderice de manera impecable en pantalla sin alterar los datos del documento de origen.
*   **SaaS Feature Gating & Transitive Plan Propagation (V17.0):** Implementamos un motor de restricción y limitación de características premium a nivel de SaaS basado en el plan contratado por cada recinto (Free, Básico, Pro, Elite). Las modificaciones y propagaciones consisten en:
    1. **Sincronización Transitiva en Cambios de Núcleo:** Actualizamos la función `handleSave` en el dashboard de administración global (`app/dashboard/settings/page.tsx`) para copiar de forma transitiva y dinámica el mapa de características (`features`) de cada plan directamente a todos los documentos de recintos en Firestore en el momento que un superadmin modifique o actualice los parámetros de planes de la plataforma.
    2. **Estructura Oficial de Planes:** Actualizamos la definición `DEFAULT_SETTINGS` para reflejar la matriz de 4 planes reales de MVP Sports con sus respectivos precios, comisiones, puntuaciones de prioridad y mapas de features (Free a 8%, Básico a 7%, Pro a 6%, Elite a 5%).
    3. **Bloqueo Inteligente de Marketing & Cupones:** Enlazamos el estado en tiempo real del recinto en el `Sidebar` para mostrar un candado dorado de "Upgrade" al lado de *Marketing y Cupones* si no cuenta con el feature activo (redirigiendo a la pantalla de licenciamiento). De forma complementaria, blindamos el acceso directo en `coupons/page.tsx` inyectando un protector visual premium completo con diseño de cristal esmerilado que destaca las ventajas de los cupones e impulsa a mejorar el plan a Elite.
    4. **Integración Limitada de APIs y SII:** En la pantalla de Configuración del Recinto (`complex/page.tsx`), inyectamos un blindaje táctil-visual en el grid de integraciones externas (MercadoPago, Transbank y SII Facturación Electrónica), cubriendo dichos módulos con un overlay de cristal y un llamado a la acción para actualizar a Elite si el recinto no posee el permiso `api` activo.
    5. **Gestión de Sedes Únicas:** Optimizamos el flujo en `courts/page.tsx` para recintos con plan restrictivo de sede única (`multiRecinto: false`). Si el dueño tiene desactivada esta opción, el sistema selecciona automáticamente su única sede deportiva omitiendo la pantalla de selección inicial y oculta de forma permanente el botón de retroceso de cabecera, logrando un anclaje impecable y seguro a su único recinto.
*   **Platform-Level Payment Gateway Disabling & Override (V17.1):** Añadimos un canal de validación cruzada y restricción absoluta para pasarelas de pago externas:
    1. **Sincronización en Configuración de Recinto:** En la pantalla `complex/page.tsx`, integramos la comprobación de los estados globales de pasarelas de pago (`globalSettings.paymentGateways`). Si el superadmin desactiva MercadoPago o Transbank en la configuración global, las correspondientes tarjetas de pasarelas en la sección del dueño son forzadas a estado desactivado visualmente (`opacity-40 grayscale`) y se bloquea completamente su manipulación agregando un mensaje descriptivo de advertencia: *"Desactivado por Plataforma"*.
    2. **Propagación Absoluta a Firestore:** Blindamos la función de guardado `handleSave` en el panel de recinto para sobrescribir y forzar las banderas `isMercadopagoActive` y `isTransbankActive` en `false` si el superadmin las ha inhabilitado globalmente, previniendo cualquier guardado inconsistente en la base de datos de Firestore.
    3. **Compatibilidad Estricta de Tipos TypeScript:** Corregimos dos errores de compilación (`tsconfig.json`) en la suite: agregamos `priorityScore` al tipo `Plan` en `billing-subscription/page.tsx` y agregamos la importación correcta de `SparklesIcon` en `coupons/page.tsx`, logrando compilar el 100% de la aplicación web con cero advertencias y cero errores de TypeScript.

---

## 🛠️ 7. ESPECIFICACIONES TÉCNICAS NUCLEARES
*   **Web Engine:** Next.js 16 (App Router) & React 19 (High Performance Edition).
*   **Mobile Stack:** Expo 54 | React Native 0.81 | NativeWind 4.
*   **Styling System:** Tailwind CSS 4 + Framer Motion V12.0.
*   **Data Vis:** Recharts High-Fidelity con personalización de tooltips.
*   **Backend:** Firebase Ecosystem (Auth, Firestore, Cloud Functions).

---

## ✅ 8. ESTADO DE DESARROLLO (EXTREME DENSITY)
| Módulo | Estado | Progreso |
| :--- | :--- | :--- |
| Infraestructura & Seguridad | **FINALIZADO** | 100% |
| Command Center SuperAdmin | **OPERATIVO** | 98% |
| Owner Dashboard (Gestión) | **OPERATIVO** | 96% |
| Manager HUD & Check-In QR | **OPERATIVO** | 97% |
| Player App (Checkout & Social) | **OPTIMIZADO** | 97% |
| Logic Engines (Pricing/ELO) | **OPTIMIZADO** | 95% |
| Gamificación & Tiers | **IMPLEMENTADO** | 88% |
| Auditoría & Reportería | **OPTIMIZADO** | 92% |
| **MVP SPORTS UNIFIED OS** | **ESTABLE** | **97% TOTAL** |

---
**ORION TECHNOLOGY - MVP Sports Chile - 2026**
*Sistemas de Inteligencia y Eficiencia Operativa de Precisión*
