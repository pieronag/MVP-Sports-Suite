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
    3. **Compatibilidad Estricta de Tipos TypeScript:** Corregimos dos errores de compilación (`tsconfig.json`) en la suite: agregamos `priorityScore` al tipo `Plan` in `billing-subscription/page.tsx` y agregamos la importación correcta de `SparklesIcon` en `coupons/page.tsx`, logrando compilar el 100% de la aplicación web con cero advertencias y cero errores de TypeScript.
*   **Manager Profile Dark Mode Switch & Unified Branding (V17.2):** Implementamos el modo oscuro táctil en el perfil del manager y solucionamos incompatibilidades críticas de Expo:
    1. **Switch Nativo de Modo Oscuro:** En el perfil del manager (`app/(owner)/perfil.tsx`), reemplazamos el antiguo botón estático por un componente `Switch` nativo de React Native con colores armónicos y optimizados para la marca, permitiendo alternar la visualización entre modo claro y oscuro de manera inmediata.
    2. **Estandarización de Footer:** Unificamos la marca corporativa del pie de página en el perfil del manager para coincidir exactamente con el del jugador final: ` MVP SPORTS CHILE • 2026`.
    3. **Corrección Typográfica Mobile:** Corregimos los valores incorrectos de `fontWeight: '750'` a `"700"` en el perfil del jugador (`app/(player)/(tabs)/perfil.tsx`), que bloqueaban el motor de renderizado de React Native e impedían la compilación de la app.
*   **Double-Layer No-Show Engine & Real-Time Local Time Sync (V17.3):** Blindamos el motor de cancelaciones automáticas sincronizando el backend y el frontend con la hora local de Chile:
    1. **Sincronización de Servidor en Zona Horaria Local:** Modificamos la API serverless `/api/cron/check-no-shows` para calcular tanto la hora actual (`now`) como las horas de reserva basándose explícitamente en el huso de Santiago de Chile (`America/Santiago`), previniendo desajustes UTC (de hasta 4 horas de diferencia) que posponían la ejecución del cron.
    2. **Validador Proactivo In-App:** Diseñamos un cargador inteligente en el panel del mánager (`app/(owner)/index.tsx`) que ejecuta una validación de No-Show local sobre las reservas cargadas tan pronto se carga el panel o se refresca la pantalla, actualizando Firestore al instante.
    3. **Intervalo Programado de Segundo Plano:** Programamos un temporizador cíclico que activa el verificador automáticamente cada 15 minutos en la app móvil mientras el mánager está en el panel, operando en perfecta consonancia con el cron job de Vercel.
    4. **Diferenciación Visual del Motivo de Cancelación:** Introdujimos badges inteligentes en la grilla del mánager para reservas anuladas, leyendo el estado transaccional para distinguir de forma visual y transparente si una reserva finalizó como `CANCELADO POR NO-SHOW` (inasistencia impaga) o `CANCELADO POR JUGADOR` (anulación voluntaria).
*   **Precision Timezone Mappings & Double-Modal Manual Workflows (V17.4):** Perfeccionamos el control operativo manual y la precisión matemática del No-Show:
    1. **Combinación Precisa de Fecha y Hora:** Corregimos la comparación temporal en el backend cron (`route.ts`), reservas del jugador (`reservas.tsx`) y panel del mánager (`index.tsx`). Ahora se parsea y combina explícitamente la fecha (`booking.date`) con las horas y minutos exactos del partido (`booking.startTime`), garantizando que la cancelación por No-Show ocurra con precisión milimétrica al momento del inicio del encuentro.
    2. **Flujo de Modales Premium de Confirmación y Éxito:** Reemplazamos los avisos nativos del sistema (`Alert.alert`) por un flujo interactivo de modales esmerilados de marca:
       * **Modal de Confirmación:** Advierte de manera segura al administrador si desea iniciar la validación de No-Shows.
       * **Modal de Éxito:** Notifica de forma elegante con un icono animado de `ShieldCheck` al completarse la purga en tiempo real.
*   **Firestore Security Rules Alignment & Fallback Hardening (V17.5):** Sincronizamos y robustecimos las reglas de seguridad de Firestore para resolver fallos de permisos al procesar cancelaciones:
    1. **Sincronización Total de Reglas:** Copiamos e implementamos las sofisticadas políticas de acceso de `mvp-sports-backend` en `mvp-sports-web/firestore.rules`.
    2. **Validación de Roles sin Custom Claims:** Integramos la función `getRole()` que consulta los documentos del usuario en las colecciones `/users`, `/profiles` y `/staff` si el token de autenticación carece de claims customizados.
    3. **Permiso de Escritura por Recinto (Tenant Scope):** Modificamos las reglas de `/bookings` para permitir la modificación de reservas a cualquier usuario que figure en la plantilla del recinto (`staff`) o que tenga asignado el recinto en su perfil, previniendo errores de "Permission Denied" durante la limpieza manual de No-Shows.
*   **Check-In Based No-Show Enforcement (V17.6):** Expandimos la lógica de negocio del motor de No-Shows para basarse estrictamente en la asistencia:
    1. **Validación por Check-In Exclusiva:** Rediseñamos el validador en la app del administrador (`index.tsx`), app del jugador (`reservas.tsx`) y backend serverless (`route.ts`). Ahora, cualquier partido que alcance su hora de inicio y no tenga marcado el check-in (`checkIn !== true`), es cancelado automáticamente y marcado bajo el estado de inasistencia (`status: 'cancelled'`, `paymentStatus: 'no-show'`).
    2. **Protección de Reservas en Juego:** Blindamos el verificador garantizando que los partidos marcados como iniciados o jugados (`status: 'active'` y `'completed'`) queden incondicionalmente protegidos y excluidos del proceso de cancelación.
*   **Web Check-In Page KPI & True Status Badge Alignment (V17.7):** Sincronizamos las métricas analíticas y badges de estado en el panel de control operativo web:
    1. **Precisión Matemática en KPIs:** Corregimos la fórmula de agregación del dashboard de Check-In (`page.tsx`). Ahora, los Ausentes (NO-SHOW) se computan con exactitud sumando reservas con `paymentStatus === 'no-show'`, `noShow === true` o inactivas que hayan superado el tiempo límite. Las reservas anuladas (CANCELADAS) ya no se mezclan con los no-shows, reportando valores financieros y de afluencia 100% verídicos.
    2. **Badge del Motivo Real en Tabla:** Actualizamos la grilla de control de acceso web para renderizar dinámicamente el badge de estado distinguiendo de forma clara entre `NO-SHOW` (inasistencia involuntaria/incumplida) y `ANULADA` (cancelación administrativa o voluntaria por jugador), reflejando con exactitud el comportamiento real de los clientes.
    3. **Tipado Unificado de Firestore:** Expandimos la interfaz local `Booking` para admitir `'no-show'` como valor nativo de `paymentStatus`, logrando una compilación del proyecto con cero errores en TypeScript.
*   **Voluntary vs No-Show Client Badge Separation (V17.8):** Enriquecimos la visualización de la lista de reservas en el panel de accesos web:
    1. **Badge de Causa junto al Nombre:** Agregamos una etiqueta de estado junto al nombre del cliente en cada fila. Al anularse la reserva, el sistema evalúa su naturaleza y renderiza un badge rojo de `'Cancelado por No-Show'` o un badge gris de `'Cancelado por Jugador'`. Esto asegura que los administradores identifiquen inmediatamente y de un vistazo el motivo real sin tener que revisar notas o bitácoras.
*   **Firebase Notes-Based Cancellation Diagnostic (V17.9):** Perfeccionamos el algoritmo de clasificación analizando los metadatos y notas adicionales en Firestore:
    1. **Detección por Notas Adicionales:** Implementamos una comprobación robusta del campo `notes` del documento en Firestore. Si contiene las palabras clave `"no-show"` o `"inasistencia"`, el sistema lo clasifica inequívocamente como No-Show, incluso si el estado financiero aún es `'pending'` y no se ha marcado de forma explícita el boolean `noShow`.
    2. **Paridad Total con Documentación Real:** Validamos contra los logs reales de producción, logrando que reservas con estado `'cancelled'` y método de pago `'pending'` sin notas de inasistencia sean clasificadas con precisión quirúrgica como `'Cancelado por Jugador'`, y aquellas con notas de inasistencia como `'Cancelado por No-Show'`.
*   **Check-In Filter Isolation & Real-Time Sync (V17.10):** Agregamos la pestaña dedicada a No-Shows en el terminal de acceso web:
    1. **Pestaña Dedicada para No-Shows:** Creamos el filtro `'noshow'` en la barra superior de búsqueda y grilla del dashboard. Al seleccionarse, muestra exclusivamente las reservas que no hicieron check-in y superaron la hora, o fueron explícitamente marcadas/anuladas por No-Show en base de datos.
    2. **Aislamiento Total de Pendientes:** Modificamos la lista de `'Pendientes'` para ocultar automáticamente partidos atrasados/expirados que se consideran inasistencias en tiempo real, garantizando una grilla limpia y enfocada en lo que el personal debe atender en ese momento.
*   **Consolidation & Premium UI/UX Optimization (V17.11):** Perfeccionamos y pulimos la interfaz del terminal de acceso eliminando redundancias visuales y mejorando la semántica:
    1. **Eliminación de Filtros Duplicados:** Removemos la barra de filtros superior que duplicaba los tabs, despejando la pantalla y dejando una vista limpia con la barra de búsqueda y el control de accesos QR libre de ruidos.
    2. **Consolidación en Tarjeta de Registro:** Trasladamos y adaptamos de manera nativa los filtros al encabezado de la tarjeta `"Registro de Hoy"`, integrando deslizamiento táctil horizontal (`overflow-x-auto`) con badges numéricos dinámicos de totalización.
    3. **Semántica de Negocio Optimizada:** Renombramos las categorías visuales alineándolas 100% al modelo de inasistencia/anulación: las cancelaciones manuales y de clientes se listan bajo **`Por Jugador`** (anuladas voluntariamente), y los No-Shows bajo **`Por Inasistencia`** (con la etiqueta correspondiente), eliminando cualquier confusión analítica o de gestión.
*   **KPI Card Labels Refactoring & Semantics (V17.12):** Refactorizamos el rotulado e indicadores secundarios en las tarjetas KPI superiores del dashboard:
    1. **Renombrado de Ausentes:** La tarjeta de "Ausentes" se renombró a **`Inasistencias`** y su etiqueta de subtext se cambió de `'NO-SHOW'` a **`Por Inasistencia`**.
    2. **Renombrado de Anuladas:** La tarjeta de "Anuladas" actualizó su etiqueta de subtext de `'MANUAL'` a **`Cancelado por Jugador`**, logrando una alineación perfecta con las causales reales del negocio y eliminando cualquier rastro de la etiqueta genérica 'noshow' en el bloque de anulaciones voluntarias.
*   **Row List Item Status Banner Refactoring (V17.13):** Sincronizamos y refactorizamos los badges y banners informativos de estado en cada fila del listado web:
    1. **Banners de Fila Coherentes:** Modificamos el banner/badge de estado en la parte derecha de cada fila del listado. Si el partido es un No-Show, el badge en mayúsculas ahora indica con elegancia **`INASISTENCIA`** y su etiqueta descriptiva inferior **`No-Show`** (reemplazando al antiguo 'NO-SHOW / Inasistencia').
    2. **Banners de Anulación Coherentes:** Si la reserva fue cancelada voluntariamente, el badge en mayúsculas ahora indica con orgullo **`CANCELADO`** y su etiqueta descriptiva inferior **`Por Jugador`** (reemplazando al antiguo 'ANULADA / Cancelado'), unificando el 100% de la semántica de la pantalla.
*   **Active Row Status Rendering Consistency Fix (V17.14):** Corregimos un bug en la grilla que causaba inconsistencia visual cuando el tiempo límite de un partido expiraba:
    1. **Corrección de isLateNoShow:** Identificamos que `isLateNoShow` no validaba que el partido ya estuviese anulado (`booking.status !== 'cancelled'`). Por ende, los partidos ya cancelados voluntariamente por el jugador que superaban la hora límite del juego pasaban a renderizarse erróneamente en rojo como "Cancelado por No-Show" y "INASISTENCIA".
    2. **Coherencia Total de Filtros:** Ajustamos `isLateNoShow` agregando la condición `booking.status !== 'cancelled'`. Con este cambio, los partidos cancelados por jugadores se muestran de manera consistente en gris como **`CANCELADO / Por Jugador`** bajo el filtro de **Por Jugador**, y los partidos no asistidos en rojo como **`INASISTENCIA / No-Show`** bajo el filtro de **Por Inasistencia**, logrando un comportamiento robusto y 100% confiable.
*   **Payments Collection Dynamic Verification (V17.15):** Implementamos un motor de validación cruzada y auditoría contra la colección `payments` en Firestore:
    1. **Búsqueda Dinámica por bookingId:** Al sincronizar el listado web de hoy, realizamos consultas optimizadas en lotes (chunks de 30 IDs) sobre la colección `payments` buscando coincidencias con los `bookingId`.
    2. **Sincronización del Estado de Pago:** Si se encuentra un registro de pago aprobado en la colección `payments`, el sistema automáticamente fuerza el estado local del partido a `'paid'` (Pagado), sin importar que el documento de la reserva aún figure como `'pending'` o `'no-show'`.
    3. **Ingresos OK Incremental:** Las inasistencias con pago aprobado ahora suman automáticamente tanto al indicador numérico como al monto total recaudado en la tarjeta de **`Ingresos OK`**, ya que son fondos aprobados y retenidos no reembolsables.
    4. **Visualización Financiera Premium:** Diseñamos badges y banners específicos en color esmeralda premium para estas inasistencias remuneradas: el badge junto al nombre destaca **`No-Show con Pago Aprobado`**, el badge de estado principal en la derecha indica **`PAGO RETENIDO`** y su etiqueta descriptiva inferior **`No-Show Pagado`** (o **`No-Show con Seña Retenida`** / **`Seña Retenida`** en amarillo ámbar según corresponda), logrando la perfección analítica-contable.
*   **Cron Payment Status Protection Fix (V17.16):** Corregimos un fallo crítico en la tarea automatizada de barrido de No-Shows (`check-no-shows` API route) que destruía la información financiera de las reservas pagadas:
    1. **Preservación de Estado Pagado:** Modificamos la lógica de la ruta del cron job para que, al marcar una reserva como cancelada por inasistencia (No-Show), **nunca** sobrescriba el campo `paymentStatus` a `'no-show'` si la reserva ya cuenta con un estado de `'paid'` (Pagado) o `'partial'` (Parcial).
    2. **Resguardo de Transacciones Webpay:** Esta protección garantiza que las transacciones aprobadas y capturadas exitosamente en pasarela nunca sean etiquetadas erróneamente en la base de datos como impagas (`no-show`), asegurando la integridad de los datos financieros.
*   **Sincronización de Horarios del Recinto & Dynamic App Booking Slots (V17.17):** Implementamos la sincronización total del horario operativo del complejo deportivo entre las pantallas de administración y la App Móvil:
    1. **Cálculo Dinámico en Guardado de Canchas:** Modificamos `handleSaveConfig` en la pantalla de Canchas (`courts/page.tsx`) para calcular dinámicamente el horario de apertura más temprano (`openTime`) y cierre más tardío (`closeTime`) a partir de la grilla semanal `weeklySchedule` configurada por el dueño, guardándolos junto a la cadena formateada `openingHours` en Firestore.
    2. **Autocorrección Proactiva en Configuración de Complejo:** En la pantalla de Configuración de Complejo (`settings/complex/page.tsx`), añadimos una capa de sincronización en `loadTenantData` que recalcula dinámicamente `openTime` y `closeTime` a partir del mapa `schedule` si existiesen discrepancias u horas de guardados legados, persistiendo los datos con `openingHours` al guardar cambios.
    3. **Slots Dinámicos en la Mobile App:** Modificamos el método `getAvailableTimeSlots` en el servicio móvil (`bookingService.ts`) para cargar en tiempo real el horario de apertura/cierre y la disponibilidad semanal del recinto, generando dinámicamente la grilla de slots por cada día y considerando si el recinto se encuentra cerrado (0 slots) o si opera en horario nocturno extendido (de madrugada), garantizando la total paridad operativa entre la administración web y la reserva móvil de los jugadores.
*   **Visualización del Horario del Día Actual & Soporte de Bloques Nocturnos (V17.18):** Perfeccionamos la presentación de horarios operativos y el motor de agrupamiento de slots en la vista de detalle de cada recinto en la App Móvil:
    1. **Resolución de Horario de Hoy:** En la pantalla de detalles de club (`app/(player)/clubes/[id].tsx`), implementamos un `useMemo` llamado `currentDayHours` que determina el día actual de la semana y busca su configuración específica dentro del mapa `schedule` de Firestore.
    2. **Manejo Inteligente de Estados y Cierres (Solo Hora):** Si el recinto está cerrado el día de hoy, renderiza de forma explícita `"Cerrado"`. Si está abierto, muestra exclusivamente el rango de horas exacto configurado para hoy (ej: `"08:00 - 02:00"`), omitiendo el nombre del día para una lectura más limpia y directa. Si el recinto carece de configuración estructurada, aplica un fallback elegante al string `openingHours`.
    3. **Soporte Completo de Bloques Nocturnos (Hasta las 3 AM):** Optimizamos `groupedSlots` para clasificar de manera impecable los bloques que operan de madrugada (`00:00` a `05:59` AM) bajo la sección de **"Noche"** (en lugar de agruparlos erróneamente en "Mañana"), ordenándolos de manera natural al final de la noche (ej. `22:00`, `23:00`, `00:00`, `01:00`, `02:00`, `03:00` AM).
    4. **Validador de Expiración Táctil Ultra-Preciso:** Rediseñamos la condición `isPast` en la grilla visual de slots usando minutos absolutos del día operativo (sumando 24 horas a los bloques de madrugada). Esto garantiza que un slot de madrugada (ej: `01:00` AM del lunes por la noche) no sea marcado erróneamente como "pasado" si el jugador está visualizando la grilla un lunes a las `22:00` PM, permitiendo reservar de forma perfecta.
    5. **Actualización de UI Premium:** Cambiamos la etiqueta genérica `"HORARIO"` por **`"HORARIO DE HOY"`** en la tarjeta de información del recinto, garantizando que el usuario visualice con precisión las horas operativas del día en curso al ingresar al recinto.
*   **Alineamiento Absoluto del Día Operativo & Corrección de Slot 23:00 (V17.19):** Elevamos el estándar del motor de horarios para manejar casos límite en clubes de alto flujo nocturno:
    1. **Fecha Operativa Autónoma:** Introducimos la función `getOperationalDate` en la vista del recinto (`[id].tsx`). Si un jugador accede a la app pasadas las 00:00 (por ejemplo, a las 02:00 AM del martes), la app forzará la visualización de la cartelera del lunes, permitiendo al usuario continuar reservando dentro de las horas de madrugada disponibles sin verse forzado al calendario del día calendario siguiente.
    2. **Protección de Volcado Temporal (Back Button):** Reforzamos el botón de retroceso de fechas en el carrusel táctil para permitir navegar libremente de regreso a la fecha operativa actual, evitando que el comparador estricto de `new Date()` bloqueara fechas de madrugada legítimas.
    3. **Corrección de Bloque `23:00` en Cierres `00:00`:** En `getAvailableTimeSlots`, corregimos un sutil pero fatal comportamiento de JS donde el parseo de `'00:00'` generaba un valor falsy `0`, que erróneamente era invalidado por un fallback por defecto (`|| 23`), reduciendo el horario del club en 1 hora completa. Ahora los clubes que cierran a la medianoche ofrecen de forma consistente y correcta el deseado slot final de las `23:00`.
*   **Sincronización Cronológica de Madrugadas & 24/7 Boundaries (V17.20):** Se corrigió un desajuste crítico donde las reservas manuales y móviles de madrugada se guardaban en el "pasado":
    1. **Motor de Inserción Cronológica (+1 Día):** Al generar el `Timestamp` nativo de Firestore para bloques nocturnos (`< 6 AM`), el motor ahora suma transparentemente `+1` día al objeto `Date`. Esto asegura que una reserva para el "Lunes Operativo a las 02:00 AM" se persista correctamente como "Martes a las 02:00 AM", garantizando que el ticket caiga exactamente en la ventana de consultas de Check-In y Calendar.
    2. **Filtro Inteligente de Inicialización:** Modificamos `getChileDateISO()` en el Master Calendar. Si un manager abre su panel de control a las `03:00 AM`, la vista se ancla automáticamente al día previo (`setDate(-1)`), previniendo que la UI salte al día siguiente antes del verdadero corte operativo (`06:00 AM`).
*   **Segregación de Pagos y Autorización de Acceso (V17.21):** Refactorizamos el modelo mental del Check-In para soportar cobros tempranos sin forzar el ingreso a la cancha:
    1. **Ciclo de Caja Independiente:** Si una reserva figura impaga, el botón "Cobrar" levanta un Modal de Caja que exige elegir el medio de pago (Efectivo, Transferencia, POS). Al confirmar, la deuda se salda (`paymentStatus: 'paid'`) y se registra el método en base de datos, pero la reserva **no se marca como ingresada**.
    2. **Ciclo de Acceso ("En Juego"):** Una vez pagada, el administrador debe usar el botón "Ingresar". Solo entonces el sistema activa el check-in y muta su estado a `status: 'active'`, poniéndola "En Juego" con exactamente la misma nomenclatura que utiliza el escáner QR de la app móvil.
*   **Web Portal Login & Unified Branding Standardization (V18.0):** Implementamos y perfeccionamos el portal de acceso administrativo y el flujo de autenticación seguro:
    1. **Botón de Retorno:** Añadimos un botón de regreso al sitio web principal ("Volver al Inicio") directamente debajo del formulario de inicio de sesión de Next.js.
    2. **Reducción de Fricción de Credenciales:** Retiramos los campos heredados de "Recordarme" y "Olvidé mi contraseña" dado que la asignación, control y restablecimiento de claves se realiza de forma centralizada e interna a través del SuperAdmin de la plataforma.
    3. **Estandarización de Marca:** Unificamos el pie de página de toda la plataforma administrativa bajo el formato de marca oficial: `© MVP SPORTS CHILE • 2026`.
*   **Portal de Jugadores & Landing Page Core Refactor (V18.1):** Rediseñamos las secciones centrales del landing principal para reflejar con exactitud la experiencia de la App Móvil:
    1. **Sección de Jugadores Simplificada:** Eliminamos toda mención al uso de códigos personales para ingreso físico al recinto. Ahora, la sección se enfoca en métricas deportivas reales basadas en ELO, XP (Experiencia obtenida) e Insignias/Logros ganados.
    2. **Pago Online (Transbank):** Cambiamos el término "Pago sin efectivo" por el término comercial **"Pago Online"**, detallando las modalidades de pago online mediante Transbank Webpay Plus o el pago manual presencial/transferencia en el recinto.
    3. **Team Squads (Chat Interno):** Actualizamos el módulo de creación de equipos ("Crea tu equipo") para remover la descripción de competencia directa y destacar la integración del **Chat Interno de Equipo** para organización táctica.
    4. **Generación de Carta Digital (ELO & Rangos):** Reemplazamos la antigua sección de "Mapa de canchas" (removiendo toda referencia a fotos y ubicaciones de recintos) por el módulo de **"Generación de Carta Digital"**, destacando los rangos competitivos y la valorización deportiva.
    5. **Mide tu Nivel:** Simplificamos el módulo eliminando los gráficos analíticos móviles pesados y centrando la propuesta en la visualización de la experiencia acumulada (XP) y logros desbloqueados por los jugadores.
*   **Landing Page - Renombrado Completo de Recintos & Español Simplificado (V18.2):** Llevamos a cabo un rediseño de contenido eliminando tecnicismos y estandarizando la terminología oficial:
    1. **Renombrado General a Recintos:** Cambiamos todas las menciones a "Complejos" por **"Recintos"** tanto en el Navbar principal como en el menú overlay móvil, logrando coherencia semántica perfecta con el modelo multi-inquilino de la app.
    2. **Español Simplificado en Bento Grid:** Reescribimos las tarjetas de la sección de administración de recintos (`AdminPreview.tsx`), eliminando jerga técnica o extranjera (HUD, CRUD, Hub, etc.) por textos fluidos e intuitivos en español (Centro de Finanzas, Calendario de Canchas, Gestión de Canchas, Marketing y Cupones, Roles y Personal).
    3. **Mapeo de Módulos Futuros ("Próximamente"):** Clasificamos las tarjetas de **Torneos** y **Academia Deportiva** con insignias táctiles de color naranja y celeste indicando **"Próximamente"**, permitiendo a los dueños visualizar las futuras expansiones tecnológicas del ecosistema MVP Sports.
    4. **Exclusive Transbank Gatekeeping:** Removemos todo rastro de Mercado Pago de la landing page e integraciones de primer nivel, declarando a **Transbank** y **SII Chile** como los únicos socios de integración oficiales de la plataforma en su lanzamiento.

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
| Command Center SuperAdmin | **FINALIZADO** | 100% |
| Owner Dashboard (Gestión Núcleo) | **FINALIZADO** | 100% |
| Manager HUD & Check-In QR | **FINALIZADO** | 100% |
| Player App (Reservas & ELO) | **FINALIZADO** | 100% |
| Motores de Precios & ELO V5.0 | **FINALIZADO** | 100% |
| Sistema de Gamificación (XP) | **FINALIZADO** | 100% |
| Finanzas & Conciliación Pro | **FINALIZADO** | 100% |
| Torneos & Ligas Automatizadas | **EN ROADMAP / PRÓXIMAMENTE** | 0% |
| Academia Deportiva (Clases/Profesores) | **EN ROADMAP / PRÓXIMAMENTE** | 0% |
| **MVP SPORTS UNIFIED OS** | **NÚCLEO OPERATIVO COMPLETO** | **85% TOTAL** |

---
**ORION TECHNOLOGY - MVP Sports Chile - 2026**
*Sistemas de Inteligencia y Eficiencia Operativa de Precisión*
