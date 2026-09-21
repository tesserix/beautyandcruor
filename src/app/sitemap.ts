import type { MetadataRoute } from "next";
import { SITE, PRESERVED_PATHS } from "@/lib/site";
import { getAllPosts } from "@/lib/posts";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = PRESERVED_PATHS.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === "/" ? "monthly" : "yearly") as "monthly" | "yearly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const posts = getAllPosts().map((p) => ({
    url: `${SITE.url}/blogs/${p.slug}/`,
    lastModified: new Date(p.date),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));

  return [...pages, ...posts];
}
