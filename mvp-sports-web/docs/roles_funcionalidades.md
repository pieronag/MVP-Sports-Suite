# MVP Sports Suite — Documentación Funcional por Roles

## Rol: Jugador (`/player/*`)

### Pantalla Principal
- Header con nombre del usuario
- **ID Card**: Avatar, nombre, rango, OVR, XP acumulados (GlowCard glassmorphism)
- **Acceso Rápido**: Grid 5 columnas (Reservas, Mapa, Torneos, Academias, Pagos, Recintos, Equipos, Estadísticas, Perfil, Ajustes)
- **Carta MVP**: Genera y comparte carta de valoración descargable (estilo TOPPS NOW 2026) con `html-to-image`

### Reservas (`/player/reservas`)
- Lista de reservas agrupadas en Activas / Historial
- Vista detalle por card con: icono deporte SVG, recinto, cancha, sport, fecha, horario, valor, pago
- Check-in, Check-out, Cancelar con reembolso parcial (comisión 3%)
- Modal QR para ingreso al recinto
- Modal encuesta post-partido (rating 1-5 + comentario)
- Modal confirmación de cancelación con política según tiempo restante

### Mapa (`/player/mapa`)
- Google Maps con markers personalizados por deporte
- Filtro por deporte (chips)
- Geolocalización del usuario
- Lista de recintos con distancia
- Al pinchar marker → redirige a `/player/clubes/[id]`

### Clubes / Detalle Recinto (`/player/clubes/[id]`)
- Hero con imagen del recinto
- Rating, distancia (geolocalización), horario del día
- Galería de imágenes (modal lightbox con navegación)
- Contacto: Teléfono, WhatsApp, Instagram, Web
- Métodos de pago aceptados (Webpay, Mercado Pago)
- Deportes disponibles, Amenidades, Reglas del recinto (modal)
- **Wizard de Reserva** (4 pasos centrados):
  1. Elegir deporte (iconos SVG)
  2. Seleccionar fecha (calendario con timezone Chile)
  3. Elegir cancha + horario (slots mañana/tarde/noche)
  4. Resumen + confirmar (redirige a checkout)
- Reseñas de jugadores

### Checkout (`/player/checkout`)
- Resumen de reserva con detalle de precio
- Input de cupón de descuento (válido por tenant/sport/vigencia)
- Selector de equipo (para reservas grupales)
- Botón "Pagar Online" → Cloud Function Webpay → redirección a Transbank

### Ticket (`/player/ticket`)
- Hero con estado (éxito/falla/reversa)
- Resumen de reserva + transacción (ID, estado, método, código)
- QR Code para ingreso al recinto
- Botón compartir WhatsApp / descargar
- Reclamo de devolución si falla la reversa automática

### Perfil (`/player/perfil`)
- Foto de perfil (editable con FileReader → base64 → Firestore)
- Nombre, email, ciudad
- Nivel de temporada (progresión por tiers: bronce → leyenda)
- Estadísticas: OVR, partidos, victorias, goles, asistencias, MVPs (con iconos SVG)
- **Insignias (20 logros)**: Artillero, Maestro, Muralla, Ganador, Estrella, Leyenda, etc. Cada una con tier BRONCE/PLATA/ORO según progreso
- **Glosario de Insignias**: Modal con progreso por badge, milestones, barra de progreso
- **Carta MVP**: Diseño TOPPS NOW 2026 con foto de perfil, OVR, nombre, stats. Descargable como PNG via `html-to-image`
- Botón "Generar Carta MVP" con preview modal + descarga + Web Share API

### Preferencias (`/player/preferencias`)
- Formulario completo: nombre, teléfono, RUT (con validación + máscara), fecha nacimiento, altura, peso
- Deporte principal + posición + lado hábil
- Horario preferido, frecuencia, intensidad
- Bio, ciudad, género
- Modo oscuro (toggle)
- Cambiar contraseña (con reautenticación)
- Soporte (redirige a reporte)
- Cerrar sesión / Eliminar cuenta

### Equipos (`/player/equipos`)
- Explorador: Crear equipo (nombre + deporte + código invitación), Unirse por código
- Listado de equipos del usuario con foto de portada
- **Detalle equipo** (`/player/equipos/[id]`):
  - Hero con fotografía (editable por capitán)
  - Stats: miembros, trofeos, código invitación (copiable)
  - Chat del equipo
  - **Roster**: cada miembro muestra foto, nombre, tier, OVR, badge de capitán
  - **Solicitudes pendientes** (capitán): aceptar/rechazar con foto + nombre
  - Menú opciones: editar equipo (nombre, descripción, deporte), eliminar, abandonar, expulsar miembro
  - Toda acción vía `teamService` con validaciones de ownership

### Estadísticas (`/player/estadisticas`)
- Rango actual con barra de progreso
- Datos físicos (altura, peso, pie dominante)
- Cómo ganar XP (reglas del sistema de gamificación)
- Bitácora de partidos y logros con tabs
- Registro manual de estadísticas internas (goles, asistencias, MVP, equipos)

### Billetera (`/player/billetera`)
- Historial de transacciones
- Cupones disponibles
- Saldo y método de pago preferido

### Reporte (`/player/reporte`)
- Formulario de incidencia con: asunto, categoría (Bug, Pago, Sugerencia, Soporte, Otro), prioridad, pantalla, descripción, pasos
- Diagnóstico automático (navegador, usuario, rol)
- Historial de reportes del usuario

## Rol: Owner / Admin (`/dashboard/*`)

### Dashboard General
- KPIs: ingresos, reservas, ocupación, miembros
- Gráficos de área y línea con filtros por período
- Tarjetas de métricas (TarjetaKpi + PanelGlass con glassmorphism)

### Recintos (Tenants)
- CRUD completo con imagen, coordenadas, región/comuna, plan, owner
- Modal de creación con selección de owners y planes SaaS (Free/Básico/Pro/Elite)
- Estados: Activo/Suspendido, deuda

### Configuración de Recinto (Complex Settings)
- Identidad: nombre, descripción, dirección
- Legal: razón social, RUT, representante legal, giro
- Contacto: WhatsApp, Instagram, sitio web
- Pasarelas de pago: Transbank (código comercio + API key), Mercado Pago
- Amenidades: WiFi, Parking, Duchas, Luz LED, Café, Pro Shop
- Reglas: lista de 13 reglas toggle
- Horarios: openTime / closeTime

### Canchas (Courts)
- CRUD de canchas por recinto
- Configuración semanal (7 días con isOpen + open/close)
- Matrix de precios por deporte (weekday / weekend por hora)
- Sports disponibles (Futbol, Futbolito, Padel, Tenis, Basquetbol, Voleibol)
- Galería de imágenes (hasta 6)

### Personal (Staff)
- CRUD de miembros del staff con autenticación
- Roles y permisos por recinto

### Calendario
- Vista general de reservas por cancha/día
- Check-in / Check-out con marcación de asistencia
- Gestión de No-Show (Inasistencia)

### Finanzas
- Ingresos por recinto, comisiones, facturación
- Gráficos históricos con filtros

### Usuarios
- Listado de jugadores con perfil, estadísticas, historial
- Analytics: gráficos de crecimiento, retención, deportes populares

### Marcas (Gamification)
- Configuración de XP, tiers, badges (bronze/silver/gold thresholds)
- Reglas de gamificación

### Torneos / Academias
- Gestión de torneos (Coming Soon)
- Gestión de academias/clases

### Auditoría
- Logs inmutables con prioridad (CRITICAL, HIGH, LOW)
- Trazabilidad: quién, qué, cuándo

### Configuración Global
- Planes SaaS (nombre, precio, features como SEO, analytics, marketing, API)
- Pasarelas globales (Mercado Pago, Webpay, SII)
- Staff directivo global
- Comisiones del sistema
