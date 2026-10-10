// Tokens visuales del área Jugador, iguales a la PWA (mvpsports.cl/player):
// fondo #020611, tarjetas planas #0A101D con borde fino, verde de marca y escala de texto compacta.
export const PLAYER = {
  dark: { bg: '#020611', card: '#0A101D', border: 'rgba(255,255,255,0.06)', soft: 'rgba(255,255,255,0.06)', text: '#F1F5F9', sub: '#94A3B8', muted: '#64748B' },
  light: { bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0', soft: '#F1F5F9', text: '#0F172A', sub: '#64748B', muted: '#94A3B8' },
  accent: '#10b981',
  brand: '#00df82',
  radius: 6,
  // Escala de texto (px) de la PWA
  font: { xs: 11, sm: 12, md: 13, base: 14, lg: 15, xl: 16, title: 18, display: 20 },
} as const;

export const playerColors = (isDark: boolean) => (isDark ? PLAYER.dark : PLAYER.light);
