import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import Script from "next/script";

import { THEME_KEY } from "@/lib/theme";
import "./globals.css";

/**
 * Space Grotesk es la tipografia de marca. `next/font` la descarga en tiempo
 * de build y la auto-hospeda: en produccion no se pide nada a Google, lo que
 * mantiene la CSP cerrada a `font-src 'self'`.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DeckForge",
    template: "%s · DeckForge",
  },
  description:
    "Constructor de mazos para el formato Escuelas Elementales de Mitos y Leyendas.",
  applicationName: "DeckForge",
  icons: { icon: "/brand/icon-violet.svg" },
  openGraph: {
    title: "DeckForge",
    description:
      "Constructor de mazos para el formato Escuelas Elementales de Mitos y Leyendas.",
    siteName: "DeckForge",
    locale: "es_CL",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0D0B14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} h-full antialiased`}>
      <body className="bg-bg text-ink flex min-h-full flex-col">
        {/* Aplica el tema guardado antes del primer pintado, para que la
            pagina no aparezca oscura y salte a clara. */}
        <Script id="tema" strategy="beforeInteractive">
          {`try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light")document.documentElement.dataset.theme="light"}catch(e){}`}
        </Script>
        {children}
        <footer className="border-line text-muted mt-12 border-t px-6 py-8 text-left text-[13px] leading-relaxed">
          Proyecto sin fines de lucro hecho por un fan y jugador de Mitos y Leyendas. El
          arte y los nombres de las cartas son propiedad de su editor.
        </footer>
      </body>
    </html>
  );
}
