import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
// Importamos los Proveedores
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CORRECCIÓN: Eliminamos el comentario y espacios entre <html> y <body>
  return (
    <html lang="es">
      <body className={`${inter.variable} ${montserrat.variable} font-sans antialiased bg-slate-50 dark:bg-[#050b14] text-slate-900 dark:text-slate-200 transition-colors duration-300`}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
