# 🏆 MVP Sports Suite - Documentación de Funcionalidades v5.0

Este documento detalla todas las funcionalidades del ecosistema **MVP Sports Suite**, optimizado para una navegación fluida, diseño de alta fidelidad y gestión de reservas de nivel profesional.

---

## 🏟️ EXPLORE & BOOKING (Módulo Recintos) [ESTADO: NUEVO / ELITE]

### 1. Buscador Dinámico "Pricing-Aware"
*   **Sincronización de Deportes**: El motor de búsqueda escanea el objeto `pricing` de Firebase para determinar disponibilidades reales. Si un recinto ofrece "Futbolito", aparecerá automáticamente al filtrar por "Fútbol".
*   **Badges Individuales**: Visualización de múltiples deportes por recinto en etiquetas ámbar independientes, eliminando el texto genérico "Club".
*   **Geolocalización Real**: Cálculo de distancia en tiempo real (KM/M) desde la ubicación del usuario al recinto con precisión balanceada.

### 2. Reserva Progresiva "Wizard Mode"
*   **Flujo Secuencial (Paso a Paso)**: Sistema de 3 pasos (Deporte > Cancha > Fecha/Horario) que guía al usuario y elimina errores de contexto de navegación (`NavigationContainer`).
*   **Auto-Selección Inteligente**: El sistema detecta recintos con un solo deporte y omite el paso inicial para acelerar la reserva.
*   **Ficha Técnica de Cancha**: Visualización de metadatos críticos desde Firebase: Superficie (Pasto Sintético/Pádel) y Características (Iluminación LED, Césped FIFA, Outdoor).

### 3. Logística de Precios y Pagos
*   **Dynamic Pricing Sync**: Cálculo automático del total basado en `pricing[deporte][horario]` definido en el panel de control.
*   **Checkout Integrado**: Salto directo y estable al módulo de pago tras confirmar la selección del bloque horario.

---

## 📱 SECCIÓN JUGADOR (Módulo Pro)

### 1. Navegación Inteligente "Home-Bound" [ESTADO: IMPLEMENTADO]
*   **Back Navigation Fix**: Sistema unificado para que el botón de retroceso regrese siempre al **Dashboard** principal, evitando bucles en la pila de navegación.
*   **Router Replace**: Navegación no-circular para asegurar que el Hub de Jugador sea siempre el punto de anclaje.

### 2. Performance Hub (Rediseño Elite) [ESTADO: ACTUALIZADO]
*   **Estadísticas "Elite Matrix"**: Dashboard analítico con color táctico **Naranja (#f97316)**. Incluye rating masivo, grid de rendimiento y progreso de habilidades.
*   **Reporte "Tactical Intel"**: Visualización de eventos desde Firebase con color **Cian (#06b6d4)**. Analytics de rendimiento y distribución técnica.
*   **Preferencias "Settings Terminal"**: Ajustes de perfil, seguridad e identidad visual.
*   **Reservas "Azure Blue"**: Gestión de pases activos con filtros rápidos por deporte.

### 3. Mercado de Squads (Equipos) [ESTADO: REDISEÑADO]
*   **Billetera Style Header**: Encabezado estandarizado con títulos en tipografía `5xl` y estética ultra-premium.
*   **Squad Builder**: Herramienta de reclutamiento y creación de legiones integrada.

---

## 🛡️ SECCIÓN MANAGER (Control Operativo)

### 1. Hub de Manager [ESTADO: OPTIMIZADO]
*   **Check-in QR**: Validación instantánea de acceso y escaneo de códigos para jugadores registrados.
*   **Gestión de Ventas**: Control operativo directo de ocupación y reservas locales.

---

## ⚙️ SERVICIOS CORE (Dashboard Web & Back-End)

### 1. Gestión de Contenido [ESTADO: ACTUALIZADO]
*   **Base64 Image Support**: Soporte completo para carga y visualización de imágenes en Base64 desde el panel web de Tenants a la App Móvil.
*   **Firebase Sync**: Sincronización estricta de perfiles, canchas y reglas de negocio.

---

*Última actualización: 18 de Mayo, 2026*
*Desarrollado para MVP Sports Chile.*
