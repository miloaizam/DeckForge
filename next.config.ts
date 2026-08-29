import type { NextConfig } from "next";

/**
 * DeckForge se publica como sitio 100% estatico en Cloudflare Pages.
 * `output: "export"` genera HTML/CSS/JS puros en `out/`: sin servidor,
 * sin API routes y sin middleware. Ver CLAUDE.md antes de tocar esto.
 */
const nextConfig: NextConfig = {
  output: "export",
  // No hay optimizador de imagenes sin servidor: las WebP ya vienen
  // redimensionadas desde scripts/convert_images.py.
  images: { unoptimized: true },
  // `/mazo` -> `/mazo/index.html`, evita redirecciones raras en Pages.
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
