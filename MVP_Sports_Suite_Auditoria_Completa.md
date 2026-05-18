# 🏆 MVP Sports Suite - Auditoría de Sistema v7.0 (Extreme Elite)

Este documento proporciona una visión detallada de todas las pantallas, funcionalidades y componentes del ecosistema **MVP Sports Suite**, desarrollado para MVP Sports Chile.

---

## 🏗️ ARQUITECTURA GENERAL
El sistema es una plataforma **Multi-Tenant SaaS** diseñada para la gestión integral de recintos deportivos y la experiencia de usuario final (jugadores).

- **Web Dashboard**: Next.js (Admin/Owner/Manager).
- **Mobile App**: Expo/React Native (Player/Owner).
- **Backend**: Firebase (Auth, Firestore, Cloud Functions).

---

## 🏛️ 1. WEB DASHBOARD (ADMINISTRACIÓN Y CONTROL)

### 🔐 Módulo de Acceso y Seguridad
- **Pantalla de Login**: Acceso seguro con validación de roles (RBAC). Estética minimalista con soporte para modo oscuro.
- **Contexto de Autenticación**: Gestión global de sesiones, persistencia y recuperación de datos de usuario desde Firestore.

### 👑 Pantallas para SUPERADMIN / ADMIN (Gestión Global)
| Pantalla | Funcionalidades Clave | Información Visualizada |
| :--- | :--- | :--- |
| **Inicio / Panel** | Resumen operativo global del ecosistema. | KPIs de recintos activos, nuevos usuarios y alertas de sistema. |
| **Ventas Totales** | Gestión financiera centralizada (GMV Est., Comisiones 8%). | Gráficos de evolución (AreaChart), efectividad de cobro y tabla de deudores. |
| **Recintos (Tenants)** | CRUD de complejos deportivos afiliados. | Listado de recintos, estado (Activo/Inactivo), ID de dueño y ubicación. |
| **Usuarios Finales** | Gestión de la base de datos de jugadores. | Perfiles de usuario, fechas de registro y actividad. |
| **Estadísticas (ELO)** | Analytics avanzado de rendimiento de jugadores. | Rankings globales, distribución de niveles y métricas de retención. |
| **Dueños** | Gestión de cuentas de propietarios de recintos. | Datos de contacto, recintos asociados y estado de cuenta. |
| **Facturación** | Generación y control de facturas por servicios SaaS. | Historial de facturas, estados de pago (Pagado/Pendiente) y montos. |
| **Quejas y Reportes** | Monitoreo de calidad y soporte al cliente. | Tickets abiertos, reportes de comportamiento y resolución de conflictos. |
| **Audit (Historial)** | Auditoría técnica de cambios en la base de datos. | Log de acciones (quién hizo qué y cuándo) para seguridad. |
| **Gamificación** | Configuración de niveles, XP y Tiers. | Definición de rangos (Bronce a Leyenda) y reglas de recompensa. |

### 🏟️ Pantallas para DUEÑO (Propietario de Recinto)
| Pantalla | Funcionalidades Clave | Información Visualizada |
| :--- | :--- | :--- |
| **Resumen** | Dashboard táctico del complejo. | Métricas de ocupación, ingresos del día y próximas reservas. |
| **Opiniones (Feedback)** | Gestión de satisfacción del cliente. | Calificaciones (Reviews), comentarios y respuesta a usuarios. |
| **Agenda (Master Calendar)** | Control total de bloques horarios. | Calendario interactivo por cancha, reservas manuales y estados de pago. |
| **Campeonatos** | Motor de torneos (Liga, Eliminación, Grupos). | Brackets, tablas de posiciones, inscripciones y calendarios de juego. |
| **Academias** | Gestión de clases y escuelas deportivas. | Listas de alumnos, horarios de clases y profesores asignados. |
| **Canchas** | Configuración técnica de activos. | CRUD de canchas, tipos de superficie (FIFA grass, LED), y disponibilidad. |
| **Staff** | Gestión de empleados y permisos. | Listado de managers/operadores y asignación de roles. |
| **Suscripción** | Control del plan SaaS del recinto. | Plan actual (Free/Elite), fecha de renovación y métodos de pago. |
| **Cupones (Marketing)** | Generación de descuentos dinámicos. | Códigos promocionales, límites de uso y porcentaje de ahorro. |
| **Info Recinto** | Perfil público del complejo. | Imágenes (Base64), dirección, geolocalización y descripción móvil. |

### 🛠️ Pantallas para MANAGER (Operativo)
- **Panel Operativo**: Vista simplificada con foco en la ocupación del turno actual.
- **Agenda**: Acceso a la grilla de reservas para lectura y pequeñas ediciones.
- **Check-in**: Módulo de validación de acceso (asociado a escáner QR en móvil).

---

## 📱 2. MOBILE APP (EXPERIENCIA DEL JUGADOR)

### ⚽ Pantallas para JUGADOR (Elite User)
| Pantalla | Funcionalidades Clave | Información Visualizada |
| :--- | :--- | :--- |
| **Home (Dashboard)** | Centro de mando personal. | **MVP Card**, Nivel (XP), Tier actual y acceso rápido a módulos. |
| **Explora / Mapa** | Buscador dinámico de recintos por cercanía. | Mapa interactivo (Google Maps), filtros por deporte (Fútbol, Pádel) y distancias. |
| **Clubes (Ficha)** | Detalle del recinto y reserva rápida. | Imágenes, servicios (duchas, estacionamiento), ratings y selector de canchas. |
| **Wizard de Reserva** | Proceso progresivo de 3 pasos. | 1. Deporte > 2. Cancha > 3. Horario/Pago (Sincronizado con Pricing real). |
| **Billetera** | Gestión de pagos y transacciones. | Saldo disponible, historial de pagos y facturas de reservas. |
| **Reservas** | Gestión de pases activos. | Listado de próximas reservas con código **QR de acceso (Ticket)**. |
| **Estadísticas** | Analytics de rendimiento individual. | Gráficos de nivel, historial de partidos y evolución de habilidades (Radar Chart). |
| **Equipos (Squads)** | Gestión de comunidades y legiones. | Creación de squads, reclutamiento de jugadores y retos. |
| **Perfil** | Identidad digital deportiva. | Avatar, biografía, Tier Badge y logros desbloqueados. |

### 📲 Pantallas para DUEÑO/STAFF (Mobile Manager)
- **Operativo**: Resumen rápido de ventas y ocupación diaria desde el smartphone.
- **Escáner QR**: Herramienta crítica para validar reservas en la entrada del recinto mediante la cámara.
- **Perfil Pro**: Switch para cambiar entre vista de jugador y vista de administración.

---

## ⚙️ 3. CORE LOGIC Y SERVICIOS (BACKEND)

### 🧬 Servicios Inteligentes
1.  **Pricing Matrix Engine**: Cálculo dinámico de precios basado en deporte, hora (Pico/Valle) y día de la semana.
2.  **SaaS Feature Gating**: Restricción automática de funcionalidades según el nivel de suscripción del recinto (Free vs Elite).
3.  **ELO System**: Algoritmo que calcula el progreso del jugador basado en partidos jugados y desempeño.
4.  **Multi-Sede Staff**: Permite que un mismo empleado gestione múltiples recintos con una sola cuenta.
5.  **Base64 Support**: Soporte nativo para carga y renderizado ultra-rápido de imágenes sin depender de buckets externos complejos en la primera etapa.

---

*Documento generado por Antigravity AI para Piero - MVP Sports Chile.*
*Última actualización: 18 de Mayo, 2026*
