import type { MetadataRoute } from "next";
import { SITE, PRESERVED_PATHS, NEW_PATHS } from "@/lib/site";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [...PRESERVED_PATHS, ...NEW_PATHS].map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === "/" ? "monthly" : "yearly") as "monthly" | "yearly",
    // Credits is the conversion surface for this audience (D9), so it ranks
    // with the homepage rather than with the discipline pages.
    priority: path === "/" ? 1 : path === "/credits/" ? 0.9 : 0.8,
  }));

  const posts = getAllPosts().map((p) => ({
    url: `${SITE.url}/blogs/${p.slug}/`,
    lastModified: new Date(p.date),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));

  return [...pages, ...posts];
}
