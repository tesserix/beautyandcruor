import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

/**
 * Training crawlers, blocked.
 *
 * The Cloudflare zone is already set to allow Search and Agent crawlers and
 * block Training. robots.txt said `Allow: /` to everything, so the two signals
 * disagreed — and robots.txt is the one an operator reads to decide what it is
 * permitted to do (docs/OPEN-QUESTIONS.md, SEO gap 6). This makes them agree.
 *
 * The position is deliberate and narrow: her photographs are the product, and
 * a corpus that has absorbed them is not a referral. It is not a position
 * against being found or cited, which is what the allow list below is for.
 *
 * Honoured voluntarily — Cloudflare remains the part with teeth.
 */
const TRAINING_CRAWLERS = [
  "GPTBot", // OpenAI, model training
  "ClaudeBot", // Anthropic, model training
  "anthropic-ai", // Anthropic, legacy
  "Google-Extended", // Gemini training; does NOT affect Google Search
  "Applebot-Extended", // Apple foundation models; does NOT affect Siri/Spotlight
  "meta-externalagent", // Meta, model training
  "CCBot", // Common Crawl — the corpus most others are built from
  "Bytespider", // ByteDance
  "Omgilibot",
  "Diffbot",
  "cohere-ai",
  "PanguBot",
  "Timpibot",
  "ImagesiftBot", // image-specific; the reason it is listed explicitly
];

/**
 * Search and user-initiated agents, allowed.
 *
 * These are how a producer actually arrives — either a search result or an
 * assistant fetching the page to answer a question and citing it. Blocking
 * them would cost referrals and gain nothing, since none of them train on it.
 */
const SEARCH_AND_AGENT_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot", // Siri and Spotlight, distinct from Applebot-Extended
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // user-initiated fetch
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: SEARCH_AND_AGENT_CRAWLERS, allow: "/" },
      { userAgent: TRAINING_CRAWLERS, disallow: "/" },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
