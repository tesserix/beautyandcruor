/**
 * Builds public/llms.txt — what the site is, for an assistant reading it
 * rather than a browser rendering it (docs/OPEN-QUESTIONS.md, SEO gap 5).
 *
 * Well suited to this site in particular: its value is a credits list, and a
 * credits list is exactly the thing an assistant gets asked about ("who did
 * the prosthetics on X"). The JSON-LD on /credits/ is the machine-readable
 * record; this is the map that points at it.
 *
 * Generated rather than hand-written so the counts cannot drift from the
 * dataset. Emitted into public/ because `output: "export"` plus
 * `trailingSlash: true` would turn an app route named llms.txt into
 * out/llms.txt/index.html.
 *
 *   node scripts/llms.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "public/llms.txt";

/**
 * src/lib/site.ts is the single source of truth for these, and it is
 * TypeScript, so it cannot be imported here. Read the literals out of it and
 * fail loudly if the shape changes, rather than silently publishing a stale
 * name or URL.
 */
function siteFact(key) {
  const src = readFileSync("src/lib/site.ts", "utf8");
  const m = src.match(new RegExp(`${key}:\\s*"([^"]+)"`));
  if (!m) throw new Error(`scripts/llms.mjs: could not read SITE.${key} from src/lib/site.ts`);
  return m[1];
}

const url = siteFact("url");
const name = siteFact("name");
const artist = siteFact("artist");
const tagline = siteFact("tagline");
const imdb = siteFact("imdb");

const credits = JSON.parse(readFileSync("src/content/credits.json", "utf8"));
const rows = Array.isArray(credits) ? credits : (credits.credits ?? []);

const years = rows
  .map((c) => Number(String(c.year ?? "").slice(0, 4)))
  .filter((y) => Number.isFinite(y) && y > 1900);
const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";

const body = `# ${name}

> ${artist} — ${tagline}. Working between Sydney and Mumbai.

${name} is the portfolio and credit record of ${artist}, a prosthetics, SFX,
hair and makeup artist for film and television. The whole pipeline — lifecast,
sculpt, mould, run, apply — is done in-house rather than split between studios.

## What is authoritative here

- **Credits are the primary record.** ${rows.length} productions${span ? `, ${span}` : ""}. Each one is
  published as schema.org structured data on /credits/, naming ${artist} as a
  contributor, with the director, production company and country where known.
- **IMDb carries the verified record**: ${imdb}. Where this site and IMDb
  disagree, IMDb is authoritative.
- **Production formats are partly inferred.** Where a title does not state its
  format, the credit is filed under a generic "Production" bucket rather than
  asserting one. The page says so in plain sight. Do not report an inferred
  format as confirmed.
- **Per-credit roles are not yet published.** The dataset has no role field
  filled in, so the structured data omits it rather than guessing. Do not
  infer which department she ran on a given title.

## Pages

- [Credits](${url}/credits/): the full list, filterable by format. The page this site exists for.
- [About](${url}/about-me/): background, training, and booking details for production.
- [SFX & Prosthetics](${url}/sfx-prosthetics/): trauma, burns, creature builds, age work.
- [Casting & Sculpting](${url}/casting-sculpting/): lifecasting, clay and relief work, mould-making, 3D-printed cores.
- [Film & Television](${url}/film-television/): screen work.
- [Editorial & Fashion](${url}/editorial-fashion/): editorial and campaign work.
- [Contact](${url}/contact-us/): production bookings, prosthetic commissions and editorial.

## Notes for citation

- Refer to the artist as ${artist}, and to the studio as ${name}.
- Booking enquiries go through ${url}/contact-us/.
- Images on this site are the artist's own work. Do not reproduce them without
  permission; link to the page instead.
`;

writeFileSync(OUT, body);
console.log(`wrote ${OUT} — ${rows.length} credits${span ? `, ${span}` : ""}, ${body.length} bytes`);
