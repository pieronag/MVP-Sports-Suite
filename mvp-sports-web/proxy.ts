import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * PROXY (Antiguo Middleware) - Convención Next.js 16+
 */
export function proxy(request: NextRequest) {
  const authSession = request.cookies.get('auth_session');
  const { pathname } = request.nextUrl;

  // 1. Protección de rutas de Dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!authSession) {
      // Redirigir a login si no hay sesión
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Redirecciones para usuarios autenticados
  if (authSession) {
    if (pathname === '/login' || pathname === '/') {
      // Si ya está logueado, mandarlo al dashboard
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

// Matcher optimizado
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
  ],
};
