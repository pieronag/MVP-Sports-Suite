# 🏛️ MVP Sports Suite - Análisis Técnico Web (v6.0 - Extreme Master)

Este documento es una auditoría técnica profunda del ecosistema web centralizado de **MVP Sports Chile**, detallando la lógica de backend-frontend y capacidades operativas avanzadas.

---

## 🏗️ ARQUITECTURA CORE & SAAS (Multi-Tenant)
El sistema opera bajo un modelo **Software as a Service (SaaS)** con aislamiento de datos por `tenantId` y gestión global de licencias.

### 1. Sistema de Suscripciones y Facturación (`/billing-subscription`)
*   **Motor de Licencias Tiered**: Gestión de 4 niveles de servicio (Free, Standard, Pro, Elite) con **Feature Gating** dinámico.
    *   **Control de Accesos**: Habilita o restringe módulos de Métricas, Marketing, SEO y Acceso a API basándose en el rango de suscripción activo.
*   **Facturación Recurrente Automática**: Lógica de cálculo de `nextRenewalDate` para ciclos mensuales y anuales, incluyendo un sistema de incentivos con **20% de descuento automático** en planes anuales.
*   **Panel de Historial Financiero**: Seguimiento de pagos y estados de suscripción para dueños de recintos мультиплек.

### 2. Gestión de Staff y Seguridad RBAC (`/staff`)
*   **Modelo de Permisos Multiplex**: Capacidad de asignar un staff a **múltiples sedes simultáneamente** (`tenantIds[]`), permitiendo una administración descentralizada.
*   **Provisionamiento Seguro de Usuarios**: Integración de una instancia secundaria de Firebase Auth para crear credenciales de empleados sin comprometer la sesión del SuperAdmin.
*   **Sincronización de Perfiles**: Puente de datos automático entre las colecciones `staff` y `users` para mantener la integridad de roles en la plataforma global.

### 3. Motor de Campeonatos y Competición (`/championships`)
*   **Versatilidad de Estructuras**: Soporte nativo para formatos de **Liga**, **Eliminación Directa** (Brackets) y **Fase de Grupos**.
*   **Segmentación Elite**: Configuración técnica por Categoría (Edad/Género) y Niveles de Habilidad (Principiante a Todo Competidor).
*   **Dashboard de Inscripciones**: Control de periodos de registro vs periodos de juego, con publicación automatizada en el marketplace de la App móvil.

### 4. Marketing Táctico y Captación (`/marketing/coupons`)
*   **Core de Cupones Dinámicos**: Generación de códigos normalizados (Uppercase/Sanitized) con lógica de descuento porcentual.
*   **Validación Condicional**: Reglas de negocio para **Compra Mínima** y límites de uso por campaña.
*   **Visual Tracking**: Barra de progreso de consumo de cupones y gestión de vigencia por rangos de fecha.

### 5. Infraestructura y Precios (`/courts`, `/pricing`)
*   **Gestión de Activos Técnicos**: CRUD de canchas con especificaciones de superficie y tags de calidad (LED, FIFA grass).
*   **Mantenimiento con Detección de Conflictos**: Sistema de bloqueo de horarios que valida la existencia de reservas previas antes de permitir el cierre técnico de una cancha.
*   **Pricing Matrix Elite**: Definición masiva de tarifas por deporte, día y bloque horario con herramientas de replicación rápida.

---
*Analizado tecnicamente por Antigravity AI para MVP Sports Chile.*
