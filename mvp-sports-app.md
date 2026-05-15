# 📱 MVP Sports Suite - Análisis Técnico Mobile (v6.0 - Extreme Master)

Este documento detalla la arquitectura técnica de la aplicación móvil de **MVP Sports**, diseñada para jugadores de alto rendimiento y gerentes operativos.

---

## ⚽ ROL: JUGADOR (Módulo Elite & Rendimiento)
La App de jugadores es un ecosistema de rendimiento deportivo que integra reserva, análisis táctico y economía interna.

### 1. Sistema de Billetera y Economía MVP (`/checkout`, `/billetera`)
*   **Orquestación de Pagos Multi-Vía**: Integración de **Mercado Pago**, tarjetas de crédito/débito y la **MVP Wallet**.
*   **Decisión Automática de Pago**: Algoritmo que detecta fondos insuficientes en la billetera y redirige el flujo hacia otros métodos de pago para asegurar la reserva.
*   **Gestión de Saldo**: Carga inmediata de créditos y seguimiento de transacciones en tiempo real.
*   **Cupones Dinámicos en Checkout**: Interfaz para aplicación de códigos promocionales con validación de reglas de negocio (mínimo de compra, vigencia).

### 2. Hub de Inteligencia Táctica (`/estadisticas`, `/reporte`)
*   **OVR & Rango Elite**: Cálculo dinámico del potencial del jugador y su posicionamiento en tiers (Bronce a Elite).
*   **Matriz de Rendimiento Técnico**: Desglose de atributos físicos: Stamina (Resistencia), Skill (Habilidad), Intensidad y Efectividad de victoria.
*   **Visualización de Última Forma**: Barra de estado interactiva (W/L) de los últimos 5 resultados en campo.
*   **Historial de Eventos Cronológico**: Registro de operaciones pasadas con metadatos del recinto y bloque horario.

### 3. Sistema de Reserva Progresiva "Wizard v6.0" (`/clubes/[id]`)
*   **Encadenamiento de Pasos Sin Salto de Estado**: Secuenciador táctico (**Deporte -> Cancha -> Horario**) que previene errores de "Navigator".
*   **Filtro Dinámico de Canchas**: Solo habilita los recursos compatibles con la disciplina deportiva elegida.
*   **Ficha Técnica Elite**: Información sobre superficies (ej: Pasto Sintético FIFA) y características (ej: Iluminación LED).

### 4. Exploración y Mapa Táctico (`/explore`, `/mapa`)
*   **Geolocalización Inmediata**: Cálculo de distancias (KM/M) basándose en coordenadas balanceadas.
*   **Filtros de Disciplina Dinámicos**: Los recintos se clasifican automáticamente según su matriz de precios (`pricing`).
*   **Insignias de Deporte Individuales**: Visualización de categorías (Pádel, Fútbol, Tenis, etc.) para una identificación rápida.

### 5. Gestión de Tickets y Accesibilidad (`/ticket`)
*   **Ticket Digital Dinámico**: Generación de códigos QR para validación de acceso al recinto.
*   **Navegación Controlada**: Lógica de retroceso (`BackHandler`) que evita bucles infinitos y asegura el retorno al Dashboard o pestaña correcta.

---

## 🛡️ ROL: MANAGER (Módulo de Operación y Control)
Interfaz diseñada para la validación crítica de acceso y control de afluencia diaria.

### 1. Escáner de Validación Táctica (`/escaner`)
*   **Check-in QR Center**: Centro de validación de entrada para jugadores, integrado con la agenda del día.

### 2. Agenda de Operaciones Diaria (`/index`)
*   **Monitor de Acceso**: Lista cronológica de reservas con identificación del cliente, cancha, hora y estado de pago (`PAGADO` / `COBRAR`).
*   **Status Tracker**: Seguimiento visual de ingresos realizados vs. pendientes.
*   **Ecosistema Multiplex**: Capacidad de alternar entre recintos si el manager tiene asignadas múltiples sedes administrativas.

---

## ⚙️ FUNCIONALIDADES TRANSVERSALES
*   **Elite UI Kit**: Uso de `LinearGradient`, efectos `blur`, y gradientes ámbar/cian para diferenciar áreas de competencia y análisis.
*   **Global Theme Sync**: Compatibilidad total con Dark y Light Mode con adaptabilidad de colores según el contexto.
*   **Integridad de Sesión**: Sistema de protección de rutas y persistencia de perfil mediante `useAuth`.

---
*Analizado tecnicamente por Antigravity AI para MVP Sports Chile.*
