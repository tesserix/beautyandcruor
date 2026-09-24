import authored from "@/content/alt.json";

/**
 * Alt text for the image library.
 *
 * Every image recovered from WordPress arrived with empty alt text, and the
 * galleries filled the gap positionally — "SFX & Prosthetics, work 11 of 52".
 * That describes where an image sits, not what is in it: useless to a screen
 * reader, worthless for image search, and the reason Lighthouse accessibility
 * could not reach 100.
 *
 * src/content/alt.json is a first draft, written from the images themselves.
 * It deliberately does not name productions, actors or titles — those are open
 * questions (docs/OPEN-QUESTIONS.md #2 and #9) and a guess in alt text is worse
 * than a plain description. It says what is visible and stops.
 *
 * It lives in src/content alongside credits.json and curation.json because it
 * is content she will correct, not code — the same place the planned authoring
 * UI (D18) will write to.
 */
const ALT: Record<string, string> = authored;

/**
 * Authored alt text for an image, or `fallback` when none has been written.
 *
 * The fallback exists so a newly added image degrades to the old positional
 * string instead of rendering with no alt at all, which is the one outcome
 * worse than a vague description.
 */
export function altFor(imageKey: string, fallback: string): string {
  const text = ALT[imageKey];
  return text && text.trim() ? text : fallback;
}

/** Every key with authored alt text. Used by the coverage test. */
export function authoredKeys(): string[] {
  return Object.keys(ALT);
}
