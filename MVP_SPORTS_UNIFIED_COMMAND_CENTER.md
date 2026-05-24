# 🏆 MVP SPORTS SUITE: UNIFIED COMMAND CENTER (V19.7)
### Manual de Operaciones y Especificación Técnica Industrial
**Propiedad de MVP SPORTS CHILE - 2026**

---

### 📂 ESTRUCTURA GENERAL DE DOCUMENTOS LEGALES (RAÍZ)
*   **Términos y Condiciones:** [TERMINOS_Y_CONDICIONES.md](file:///c:/Users/Piero/Desktop/PROYECTOS%202026/MVP-Sports-Suite/TERMINOS_Y_CONDICIONES.md) — Reglas operativas, comisiones y políticas de uso.
*   **Políticas de Privacidad:** [POLITICA_DE_PRIVACIDAD.md](file:///c:/Users/Piero/Desktop/PROYECTOS%202026/MVP-Sports-Suite/POLITICA_DE_PRIVACIDAD.md) — Protección de datos bajo la Ley N° 19.628 de Chile.

---

## 🏗️ 1. FILOSOFÍA DE INGENIERÍA: EXTREME ELITE™
Bajo la arquitectura **Multi-Tenant SaaS**, el sistema elimina la fricción operativa mediante interfaces de alta densidad (**Executive Slim UI**), motores de precios dinámicos y una infraestructura móvil de baja latencia impulsada por Expo y React Native.

---

## 💻 2. MÓDULO SUPER-ADMIN & CONTROL GLOBAL (ELITE COMMAND)
*El nivel de acceso más alto para la gestión del ecosistema completo.*
*   **Global Sales Intel:** Visualización de GMV total y gestión de comisiones.
*   **Tenant Operations Center:** Alta y baja de recintos deportivos (Tenants).
*   **System Audit Log:** Historial técnico de cambios inmutables.
*   **Billing & SaaS Ledger:** Gestión de facturación por servicios SaaS.

## 🏟️ 3. MÓDULO DUEÑO DE RECINTO (OWNER DASHBOARD)
*Gestión táctica y financiera para propietarios de complejos deportivos.*
*   **Agenda & Master Calendar:** Control absoluto de bloques horarios por cancha.
*   **Financial Hub Pro:** Métricas de ocupación e ingresos diarios.
*   **Marketing & Coupons:** Códigos promocionales dinámicos (V18.0).
*   **Staff Permissions Matrix:** Gestión de roles y permisos.

## 🛠️ 4. MÓDULO MANAGER & OPERATIVO (STAFF HUD)
*Herramientas críticas para el personal en sitio.*
*   **Operational Dashboard:** Vista simplificada para ocupación en tiempo real.
*   **Tunnel View QR Validator:** Escáner inmersivo de alta velocidad (30 FPS).
*   **Manual Booking Override:** Capacidad para bloqueos técnicos o manuales.

## 📱 5. MOBILE APP EXPERIENCE (ELITE PLAYER)
*La interfaz maestra para el usuario final.*
*   **Explore & Map Hub:** Buscador dinámico con geolocalización.
*   **Direct Payment Checkout:** Transbank Webpay Plus integrado.
*   **Unified Transaction Ledger:** Billetera digital y transparencia financiera.
*   **Performance Analytics & ELO:** Radar Charts y topes anti-fraude V18.1.

---

## ⚙️ 6. MOTORES TÉCNICOS AVANZADOS (AUDITORÍA V16-V19)

### 💻 A. WEB DASHBOARD & PANEL DE CONTROL
*   **SaaS Feature Gating & Transitive Plan Propagation (V17.0):** Motor de restricción premium por plan contratado (Free, Básico, Pro, Elite).
*   **Platform-Level Payment Gateway Disabling (V17.1):** Validaciones cruzadas para inhabilitar MercadoPago/Transbank globalmente.
*   **Double-Layer No-Show Engine & Real-Time Local Time Sync (V17.3):** Blindaje contra cancelaciones sincronizado con el huso horario de Santiago de Chile.
*   **Check-In Based No-Show Enforcement (V17.6):** Validación estricta que cancela partidos sin check-in en la hora de inicio.
*   **Web Check-In Page KPI & True Status Badge (V17.7):** Corrección matemática de afluencia, separando "Anuladas" de "No-Shows".
*   **Firebase Notes-Based Cancellation Diagnostic (V17.9):** Algoritmo inteligente que clasifica inasistencias analizando el campo `notes`.
*   **Sincronización de Horarios del Recinto (V17.17):** Sincronización en vivo del horario operativo (`openTime`, `closeTime`).
*   **Motor de Cupones y Marketing Dinámico (V18.0):** Arquitectura completa de fidelización de clientes con validación estricta (1%-100%).
*   **Portal de Jugadores & Landing Page Refactor (V18.1):** Módulos actualizados con métricas deportivas y generación de Carta Digital ELO.
*   **Web Portal Login & Unified Branding Standardization (V18.0 / V19.5):** Bypass seguro de inicio de sesión para administradores sin correo verificado.
*   **Sistema de Reporte de Incidencias & Consola de Gestión (V19.7):** Soporte técnico bidireccional con captura automática de entorno.

### 📱 B. APP MÓVIL
*   **Direct Payment Checkout & Webpay Integration:** Pago nativo vía Transbank sin fricción (V17.28: Corrección Keyboard-Squishing).
*   **Manager Profile Dark Mode Switch (V17.2):** Cambio nativo de modo claro/oscuro en el perfil de personal.
*   **Reglas de Reembolso Dinámico & Bloqueo por Check-In (V17.26):** Ventana de 4 horas para devolución garantizada.
*   **Paginación Infinita Inteligente (V17.35):** Carga progresiva en historial para evitar latencia (10 ítems por lote).
*   **Comprobante Oficial de Reintegro Manual (V17.37):** Flujo de devolución fallida por Transbank con botón directo a WhatsApp.
*   **Restricción Anti-Fraude en Gamificación y Estadísticas (V18.1 / V19.2):** Límite matemático (`Math.min(20)`) para XP Farming en goles/asistencias preservando integridad global.
*   **Resolución de Asset Corrupto (V18.5):** Compilación nativa de Google Play arreglada corrigiendo headers binarios de iconos.
*   **Optimizaciones Visuales & Flujo Anti-Descarte (V18.6):** Transiciones fluidas (`slide_from_right`) y modal interactivo anti-pérdida de cambios.

### ☁️ C. BACKEND SERVERLESS & INFRAESTRUCTURA
*   **Webpay Plus Payment Pipeline:** Cloud Function `createWebpayTransaction` operando en la región de baja latencia `southamerica-west1`.
*   **Zero-Dependency Serverless Architecture Refactor (V16.2):** Eliminación de cron jobs pasivos, delegando lógica de purga a interacción reactiva frontend.
*   **Player Account Control & Deletion Engine (V16.3):** Baja con reautenticación segura protegiendo integridad de las reservas pasadas.
*   **Firestore Security Rules Alignment (V17.5 / V19.6):** Reglas ultra restrictivas de acceso inquilino (Tenant Scope).
*   **Motor de Reembolso Parcial Automático Transbank (V17.27):** Reintegro automatizado descontando de manera segura la comisión operativa del 3%.
*   **Blindaje Resiliente contra Fallos Físicos de API (V17.33):** Cancelación tolerante y liberación de canchas para tokens expirados en la pasarela.
*   **Notificaciones Email (Resend) & Políticas Legales (V19.0):** Envío serverless en Vercel con integración de T&C y Privacidad.
*   **Auditoría Unificada Multicanal Inmutable (V19.6):** Pipeline de auditoría con IDs únicos `TRC-XXXXXX` y geolocalización IP en Firestore.

---

## ✅ 7. ESTADO DE DESARROLLO Y PROGRESO INTEGRAL

### 📱 APP MÓVIL (`mvp-sports-app`) — **100.0%**
| Módulo Clave | Estado | Funcionalidad Operativa |
| :--- | :---: | :--- |
| **Login Móvil / Bypass** | **FINALIZADO** | Redireccionamiento inteligente y bypass para roles de staff. |
| **Billetera & Ledger** | **FINALIZADO** | Balance Ejecutivo con segregación contable online vs local. |
| **Checkout WebView** | **FINALIZADO** | Pagos webpay plus, cupones dinámicos V18 y pre-validación de deuda. |
| **Check-in QR Escáner** | **FINALIZADO** | Optimizado a 30 FPS para túneles oscuros. |
| **Gamificación & ELO** | **FINALIZADO** | Evolución del deportista con topes matemáticos de anti-fraude. |

### 💻 PANEL WEB (`mvp-sports-web`) — **100.0%**
| Módulo Clave | Estado | Funcionalidad Operativa |
| :--- | :---: | :--- |
| **Admin Dashboard** | **FINALIZADO** | Multi-tenant SaaS, gestión de sedes, bloqueos regionales. |
| **Check-In Dashboard** | **FINALIZADO** | Analíticas de ocupación, cancelación matemática de No-Shows. |
| **Marketing & Cupones**| **FINALIZADO** | Códigos porcentuales protegidos con restricción de cupos. |
| **Monitor de Auditoría**| **FINALIZADO** | Rastreo inmutable de acciones críticas e IPs forenses. |

### ☁️ BACKEND & NUBE (`mvp-sports-backend`) — **100.0%**
| Módulo Clave | Estado | Funcionalidad Operativa |
| :--- | :---: | :--- |
| **Motor de Pagos** | **FINALIZADO** | Reversas Transbank y cobros Oneclick procesados asíncronamente. |
| **Seguridad Firestore**| **FINALIZADO** | Aislamiento por Tenant, roles sin custom-claims (fallbacks de seguridad). |
| **Pipeline Base64** | **FINALIZADO** | Persistencia nativa de imágenes evitando lag de CDN. |

---

## 🚀 8. ROADMAP & FUNCIONES PENDIENTES
*Estas características están programadas en la hoja de ruta para su completa interconexión y pruebas QA (V20).*

*   **🏆 Torneos & Ligas Automatizadas (Progreso: 95%):**
    *   *Desarrollado:* Generadores dinámicos de Brackets (Eliminación directa) y Fixture (Round-Robin) en backend. La Consola Web permite establecer el número máximo de equipos y la inscripción funciona vía Transbank en la App Móvil.
    *   *Pendiente:* Pruebas de borde en avance de fase (Fase de Grupo hacia Eliminación Directa).
*   **🎓 Academia Deportiva (Progreso: 90%):**
    *   *Desarrollado:* El Dashboard web soporta el CRUD avanzado de clases, profesores y bloques semanales con sincronización en tiempo real.
    *   *Pendiente:* Habilitación del sistema de pago recurrente mensual para la matricula móvil.

---
**ORION TECHNOLOGY - MVP Sports Chile - 2026**
*Sistemas de Inteligencia y Eficiencia Operativa de Precisión*
