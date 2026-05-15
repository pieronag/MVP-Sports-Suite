# 🏆 MVP Sports Suite - Documentación Funcional por Roles

Este documento detalla todas las funcionalidades del sistema **MVP Sports Suite**, organizadas según el nivel de acceso y responsabilidades de cada perfil de usuario.

---

## 🛡️ ROL: ADMINISTRADOR CENTRAL (SUPERADMIN)
Este es el rol de mayor jerarquía, responsable de la infraestructura global del sistema y la supervisión de todos los recintos deportivos.

### 1. Panel Maestro (Protocolo Admin)
*   **Gestión Comercial y Planes**: 
    *   Configuración dinámica de planes SaaS (Free, Básico, Pro, Elite).
    *   Ajuste de precios mensuales y beneficios específicos (SEO, Reportes, Soporte) sincronizados con Firebase Cloud.
*   **Protocolos de Auditoría**:
    *   Visualización de logs inmutables con niveles de prioridad (`CRITICAL` para destrucciones, `HIGH` para finanzas, `LOW` para tests).
    *   Trazabilidad completa de acciones administrativas (Quién, Qué, Cuándo).
*   **Seguridad y Resiliencia**:
    *   **Snapshot Manual**: Creación de respaldos de la base de datos en tiempo real.
    *   **WIPE Selectivo**: Purgado total de datos dinámicos (reservas, logs, notificaciones) manteniendo intacta la configuración de marca.
    *   **Stress Test**: Botón de inserción masiva para validar la integridad del sistema bajo carga pesada.
*   **Branding (Marca Blanca)**:
    *   Personalización global del nombre de la plataforma, logos y colores de acento.
    *   Configuración de correos de soporte técnico global.

### 2. Finanzas Centralizadas
*   **Gestión de Comisiones**: Ajuste del % de comisión por transacción que cobra el ecosistema.
*   **Control de Pasarelas**: Activación/Desactivación de métodos de pago (Mercado Pago, Webpay, Stripe).

### 3. Supervisión de Recintos (Venues)
*   Visualización de todos los ingresos proyectados y reales por cada complejo deportivo.
*   Monitorización del estado de conexión de las APIs de infraestructura.

---

## 🏟️ ROL: ADMINISTRADOR DE RECINTO (OWNER)
Dueño o gerente de un complejo deportivo específico. Su enfoque es la rentabilidad de su local.

### 1. Dashboard de Operaciones
*   **Métricas en Vivo**: Visualización de ingresos (CLP) y volumen de transacciones mediante gráficos avanzados de áreas y líneas.
*   **KPIs Críticos**: Ocupación de canchas, ingresos del día anterior y promedio proyectado por día.
*   **Filtros Inteligentes**: Capacidad de filtrar toda la data por rangos históricos (Día, Semana, Mes, Año).

### 2. Control de Canchas y Horarios
*   **Ajuste de Tarifas**: Capacidad de cambiar el precio de las canchas según franjas horarias.
*   **Bloqueos Preventivos**: Inhabilitación de canchas por mantenimiento o eventos privados.
*   **Configuración de Tiempos**: Ajuste del tiempo de gracia para reservas (ej. cancelar automáticamente después de 15 min de retraso).

### 3. Gestión de Personal (Staff)
*   **Directorio Local**: Creación y edición de perfiles para recepcionistas y personal de campo.
*   **Asignación de Roles**: Definición de quién puede ver ingresos y quién solo puede gestionar el calendario.

---

## 💼 ROL: RECEPCIONISTA / STAFF
Perfil operativo centrado en el día a día del recinto.

### 1. Gestión de Reservas (Booking Core)
*   **Vista de Calendario**: Interfaz visual para ver el estado de todas las canchas en tiempo real.
*   **Check-in y Pagos**: Marcado de asistencia y procesamiento de pagos presenciales.
*   **Cobro de Garantías**: Gestión de depósitos previos para asegurar la reserva.

### 2. Atención al Cliente (CRM Básico)
*   **Base de Usuarios**: Búsqueda rápida de clientes frecuentes y visualización de deudas pendientes.
*   **Notificaciones**: Envío de confirmaciones vía correo o alertas internas.

---

## ⚽ ROL: CLIENTE / JUGADOR
Usuario final que busca y reserva canchas mediante la aplicación móvil o web.

### 1. Búsqueda y Filtros
*   Localización de complejos deportivos más cercanos o por deporte (Tenis, Padel, Fútbol).
*   Visualización de fotos reales de las canchas y servicios (Duchas, Estacionamiento, Cafetería).

### 2. Flujo de Reserva
*   **Selección de Horario**: Vista de disponibilidad real.
*   **Pago Seguro**: Pago integrado vía Mercado Pago o Stripe.
*   **Mis Reservas**: Historial de juegos pasados y próximos encuentros con código QR para ingreso.

---

## 📈 DOCUMENTACIÓN TÉCNICA GENERAL
*   **Firebase Integration**: Sincronización en tiempo real para evitar reservas duplicadas (Overbooking).
*   **Responsive UI**: Optimizado para Tablets de recepción y móviles de jugadores.
*   **CLP Standard**: Todo el sistema financiero opera bajo el estándar de moneda completa para Chile.
