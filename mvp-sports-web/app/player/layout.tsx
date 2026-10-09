import type { Metadata, Viewport } from "next";
import PlayerLayoutClient from "@/components/player/PlayerLayoutClient";

// Metadata PWA del área Jugador: manifest propio con scope /player
export const metadata: Metadata = {
  manifest: "/player/manifest.webmanifest",
  applicationName: "MVP Sports",
  appleWebApp: {
    capable: true,
    title: "MVP Sports",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020611",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <PlayerLayoutClient>{children}</PlayerLayoutClient>;
}
