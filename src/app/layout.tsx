import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE, ASSET_ORIGIN } from "@/lib/site";
import { JsonLd, personSchema, localBusinessSchemas } from "@/lib/jsonld";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

/**
 * The three faces, self-hosted rather than fetched.
 *
 * These were next/font/google, which downloads the font files during `next
 * build`. That put a network call to Google on the critical path of every
 * container build, and it failed often enough to matter: the same commit
 * built on a branch and failed on main minutes later, reporting
 *
 *   Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
 *
 * with a varying number of errors and NextFontGoogleFontFileReplacer in the
 * trace — a failed fetch surfacing as a resolution error, which reads like a
 * dependency problem and is not one.
 *
 * The files in src/fonts are the Latin subsets next/font itself generated,
 * lifted from a build that worked. Same bytes, same subsetting; the only
 * thing that changes is that the build no longer asks the internet for them.
 * All three are SIL Open Font License, so shipping them is expressly allowed.
 *
 * Eczar and Archivo are variable and cover their whole weight range from one
 * file; IBM Plex Mono ships a file per weight, so both are declared.
 */

/**
 * Display face. Chosen on review recommendation: a cut, heavy serif reads
 * alongside the title cards and one-sheets this audience sees daily, where a
 * neutral grotesque reads as a template. Its Devanagari companion also covers a
 * Hindi credits line later if wanted.
 */
const eczar = localFont({
  src: "../fonts/eczar.woff2",
  weight: "500 800",
  style: "normal",
  variable: "--font-eczar",
  display: "swap",
});

const archivo = localFont({
  src: "../fonts/archivo.woff2",
  weight: "400 600",
  style: "normal",
  variable: "--font-archivo",
  display: "swap",
});

/** The "credit" register: counters, captions, metadata, nav labels. */
const plexMono = localFont({
  src: [
    { path: "../fonts/plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/plex-mono-500.woff2", weight: "500", style: "normal" },
  ],
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
      <body>
        {/* Every photograph on the site is served from the assets bucket, and
            the first one is the LCP element. Opening the connection alongside
            the document saves the DNS + TLS round trips that would otherwise
            happen only once the markup referencing it has parsed.

            Rendered in the tree rather than inside a hand-written <head>:
            React hoists link tags itself, and an explicit <head> here put a
            text node in it whenever ASSET_ORIGIN was empty — `"" && …` renders
            the empty string — which fails hydration (React #418) and takes the
            stylesheet down with the regenerated tree. Production always sets
            the variable so it never surfaced there, but every local build
            without it came up unstyled. The ternary returns null, not "". */}
        {ASSET_ORIGIN ? (
          <>
            <link rel="preconnect" href={ASSET_ORIGIN} crossOrigin="" />
            <link rel="dns-prefetch" href={ASSET_ORIGIN} />
          </>
        ) : null}
        {/* First stop for a keyboard or screen-reader user: the header and its
            nav sit ahead of the content on every page. */}
        <a href="#main" className="skip">
          Skip to content
        </a>
        {children}
        <JsonLd schemas={[personSchema(), ...localBusinessSchemas()]} />
        <Analytics />
      </body>
    </html>
  );
}
