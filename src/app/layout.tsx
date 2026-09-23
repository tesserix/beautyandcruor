import type { Metadata, Viewport } from "next";
import { Eczar, Archivo, IBM_Plex_Mono } from "next/font/google";
import { SITE, ASSET_ORIGIN } from "@/lib/site";
import { JsonLd, personSchema, localBusinessSchemas } from "@/lib/jsonld";
import "./globals.css";

/**
 * Display face. Chosen on review recommendation: a cut, heavy serif reads
 * alongside the title cards and one-sheets this audience sees daily, where a
 * neutral grotesque reads as a template. Its Devanagari companion also covers a
 * Hindi credits line later if wanted.
 */
const eczar = Eczar({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-eczar",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

/** The "credit" register: counters, captions, metadata, nav labels. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.artist} — ${SITE.name}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.tagline,
  applicationName: SITE.name,
  authors: [{ name: SITE.artist, url: SITE.url }],
  creator: SITE.artist,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_AU",
    url: SITE.url,
    title: `${SITE.artist} — ${SITE.name}`,
    description: SITE.tagline,
    // Built by scripts/og.mjs from the wordmark and the published portrait.
    // Without it every share of a visual portfolio rendered as a bare text
    // card, and localBusinessSchemas() pointed `image` at a 404.
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE.artist} — ${SITE.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.artist} — ${SITE.name}`,
    description: SITE.tagline,
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#07070A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${eczar.variable} ${archivo.variable} ${plexMono.variable}`}>
      <head>
        {/* Every photograph on the site is served from the assets bucket, and
            the first one is the LCP element. Opening the connection alongside
            the document saves the DNS + TLS round trips that would otherwise
            happen only once the markup referencing it has parsed. */}
        {ASSET_ORIGIN && (
          <>
            <link rel="preconnect" href={ASSET_ORIGIN} crossOrigin="" />
            <link rel="dns-prefetch" href={ASSET_ORIGIN} />
          </>
        )}
      </head>
      <body>
        {/* First stop for a keyboard or screen-reader user: the header and its
            nav sit ahead of the content on every page. */}
        <a href="#main" className="skip">
          Skip to content
        </a>
        {children}
        <JsonLd schemas={[personSchema(), ...localBusinessSchemas()]} />
      </body>
    </html>
  );
}
