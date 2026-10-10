import type { Metadata, Viewport } from "next";
import { Fira_Sans, Inter, Fira_Code } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { QueryProvider } from "../context/QueryProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const firaSans = Fira_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "900"], variable: "--font-fira-sans", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const firaCode = Fira_Code({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fira-code", display: "swap" });

export const metadata: Metadata = {
  title: "MVP Sports | Reserva de Canchas y Software Deportivo en Chile",
  description: "¿Buscas dónde jugar? Encuentra y reserva al instante canchas de pádel, futbolito y tenis. Además, descubre el software líder para la gestión de recintos.",
  keywords: [
    "arriendo de canchas", "arriendo padel", "arriendo futbolito", "reserva de canchas",
    "canchas de padel", "canchas de futbolito", "canchas de tenis", "jugar futbolito",
    "app para reservar canchas", "arriendo de canchas chile", "software para complejos deportivos",
    "gestión de recintos deportivos", "sistema de reservas para canchas", "software administracion de canchas",
    "mvp sports"
  ],
  manifest: "/manifest.json",
  icons: { apple: "/icons/apple-touch-icon.png" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mvpsports.cl"),
  alternates: { canonical: "/" },
  // Vista previa al compartir el enlace (WhatsApp, redes, buscadores)
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "MVP Sports",
    title: "MVP Sports | Reserva canchas en segundos",
    description: "Reserva canchas de pádel, futbolito y tenis, paga online con Mercado Pago y gestiona tu recinto deportivo.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "MVP Sports" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MVP Sports | Reserva canchas en segundos",
    description: "Reserva canchas de pádel, futbolito y tenis y gestiona tu recinto deportivo.",
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#020611",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CORRECCIÓN: Eliminamos el comentario y espacios entre <html> y <body>
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${firaSans.variable} ${inter.variable} ${firaCode.variable}`}>
      <head>
        <link rel="preconnect" href="https://mvp-sports-chile.firebaseapp.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`font-sans antialiased bg-slate-50 dark:bg-mvp-dark text-slate-900 dark:text-slate-200 transition-colors duration-300`}>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
