import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
// Importamos los Proveedores
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: "MVP Sports | La Plataforma Deportiva Todo-en-Uno",
  description: "La solución definitiva para la gestión de recintos deportivos, torneos y academias. Eleva tu juego con MVP Sports.",
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
        <SpeedInsights />
      </body>
    </html>
  );
}
