import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = join(process.cwd(), "src/content/posts");

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  heroKey?: string;
  body: string;
  readingMinutes: number;
};

export function getAllPosts(): Post[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parse(readFileSync(join(DIR, f), "utf8")))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPost(slug: string): Post | null {
  try {
    return parse(readFileSync(join(DIR, `${slug}.mdx`), "utf8"));
  } catch {
    return null;
  }
}

function parse(raw: string): Post {
  const { data, content } = matter(raw);
  const words = content.trim().split(/\s+/).length;
  return {
    slug: String(data.slug),
    title: String(data.title),
    date: String(data.date),
    excerpt: String(data.excerpt ?? ""),
    heroKey: data.heroKey ? String(data.heroKey) : undefined,
    body: content.trim(),
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}
