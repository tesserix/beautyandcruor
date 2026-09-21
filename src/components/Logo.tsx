import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The brand mark, traced from the raster original to two paths so the script
 * and the leaf recolour independently (--logo-ink / --logo-leaf).
 *
 * Inlined rather than <img> so it inherits colour and needs no extra request.
 * Read at build time; this is a server component.
 */
const svg = readFileSync(join(process.cwd(), "brand/logo.min.svg"), "utf8");

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{ display: "block", ["--logo-ink" as string]: "var(--color-chalk)" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
