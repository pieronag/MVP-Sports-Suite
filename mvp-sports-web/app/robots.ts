import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://mvpsports.cl").replace(/\/$/, "");

// Indexar la landing y páginas legales; nunca paneles privados ni API
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/terms", "/privacy"], disallow: ["/dashboard", "/player", "/api", "/login", "/monitoring"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
