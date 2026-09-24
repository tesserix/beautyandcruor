import { SITE } from "@/lib/site";

/**
 * OpenPanel, the platform's own analytics — already running at
 * analytics.tesserix.app and already used by tesserix-blog.
 *
 * Nothing measured this site at all, so a cutover from the WordPress build
 * would have been unmeasurable: no way to tell whether anyone reaches the
 * credits page, or abandons the enquiry form, or arrives from IMDb.
 *
 * NOT `@openpanel/nextjs`, which is what the blog uses. That package expects a
 * runtime config route, and this is `output: "export"` — there is no server to
 * answer one. It would also add a React dependency to a bundle already over
 * its budget, where the raw snippet is about a kilobyte.
 *
 * The client id is public by design — it identifies the project to a script
 * running in the browser — so baking it in at build time is not a secret leak.
 * It arrives the same way the asset host does: an ARG in the Dockerfile.
 * Absent, this renders nothing at all rather than a broken script tag.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID ?? "";
const API_URL =
  process.env.NEXT_PUBLIC_OPENPANEL_API_URL ?? "https://analytics.tesserix.app/api";
const SCRIPT_URL =
  process.env.NEXT_PUBLIC_OPENPANEL_SCRIPT_URL ?? "https://analytics.tesserix.app/op1.js";

export function Analytics() {
  if (!CLIENT_ID) return null;

  const init = {
    clientId: CLIENT_ID,
    apiUrl: API_URL,
    trackScreenViews: true,
    // The two things worth knowing on a portfolio: did they leave for IMDb or
    // Instagram, and did they get as far as the enquiry form.
    trackOutgoingLinks: true,
    trackAttributes: true,
  };

  return (
    <>
      <script src={SCRIPT_URL} defer async />
      <script
        // Authored here, never from user input.
        dangerouslySetInnerHTML={{
          __html: `window.op=window.op||function(...a){(window.op.q=window.op.q||[]).push(a)};window.op('init',${JSON.stringify(
            init,
          )});`,
        }}
      />
    </>
  );
}

/** Exported for the enquiry form, so a submission is a countable event. */
export const ENQUIRY_EVENT = `${SITE.name} enquiry submitted`;
