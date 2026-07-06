# MVP Sports Suite — Web App

Plataforma integral de gestión deportiva con panel administrador (owner) y experiencia de jugador (player).

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** Tailwind CSS, glassmorphism (`backdrop-blur-xl`), `rounded-[14px]`
- **Bases de datos:** Firebase Firestore (tiempo real)
- **Autenticación:** Firebase Auth
- **Mapas:** Google Maps API (`@react-google-maps/api`)
- **Captura de imágenes:** `html-to-image`
- **Deporte:** Chile (`southamerica-west1`)
- **Moneda:** CLP

## Estructura

```
app/
  page.tsx              # Landing principal (mvpsports.cl)
  login/                # Autenticación
  dashboard/            # Panel administrador/owner (25+ páginas)
  player/               # Experiencia jugador (17 rutas)
    page.tsx            # Dashboard jugador
    reservas/           # Mis reservas
    mapa/               # Google Maps con recintos
    clubes/[id]/        # Detalle de recinto + wizard de reserva
    checkout/           # Pago vía Webpay
    ticket/             # Ticket post-pago con QR
    perfil/             # Perfil con carta MVP descargable
    preferencias/       # Ajustes de cuenta
    equipos/            # Equipos, roster, chat, solicitudes
    estadisticas/       # Estadísticas y logros
    billetera/          # Wallet y pagos
    torneos/            # Torneos (Coming Soon)
    academias/          # Academias (Coming Soon)
    reporte/            # Reportar incidencia
services/
  player/               # Servicios player (booking, venue, team, user, etc.)
components/
  landing/              # Componentes landing page
  icons/                # SVG icons deportivos
  courts/               # Componentes dashboard (cards, modals)
```

## Convenciones

- `rounded-[14px]` en todos los elementos visuales (excepto `rounded-full`)
- `font-semibold` / `font-medium` (nunca `font-bold` o `font-black`)
- Glassmorphism: `bg-white/80 backdrop-blur-xl` (light) / `bg-[#0F172A]/90 backdrop-blur-xl` (dark)
- Dark mode vía clase `dark:` de Tailwind + variable `isDark`
- Sin emojis como iconos — solo lucide-react o SVG inline
- QR con `qrcode.react`

## Desarrollo

```bash
npm run dev      # Dev server (puerto 3000)
npm run build    # Build producción
npm run lint     # Linter
```

## Firebase

- Proyecto: `mvp-sports-chile`
- Región: `southamerica-west1`
- Colecciones principales: `users`, `tenants`, `courts`, `bookings`, `teams`, `reports`, `feedback`

## Roles

| Ruta | Rol |
|------|-----|
| `/player/*` | Jugador |
| `/dashboard/*` | Owner / Admin |
| `/login` | Ambos |
