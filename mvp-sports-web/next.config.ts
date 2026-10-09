/** @type {import('next').NextConfig} */
const nextConfig = {
  // El SW vive en /player/sw.js pero debe controlar también "/player" (sin barra)
  async headers() {
    return [
      {
        // Encabezados de seguridad para todo el sitio
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Cámara (escáner QR de check-in) y ubicación (mapa) solo para el propio sitio
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=(), payment=(self)' },
        ],
      },
      {
        source: '/player/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/player' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      {
        pathname: '/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

const { withSentryConfig } = require("@sentry/nextjs");
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
});
