import type { Metadata } from "next";
import Link from "next/link";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Journal",
  description: "Writing on prosthetics, SFX and the craft behind the work.",
  alternates: { canonical: "/blogs/" },
};

export default function Blogs() {
  const posts = getAllPosts();
  return (
    <>
      <Chrome />
      <main style={{ paddingTop: "var(--hud)", paddingInline: "var(--gut)" }} className="pt-10 pb-20">
        <p className="lab">Journal</p>
        <h1 className="mt-2 font-display text-[clamp(32px,9vw,56px)] leading-[1.02] font-600">
          Journal
        </h1>
        <ul className="mt-8">
          {posts.map((p) => (
            <li key={p.slug} className="border-b border-hair last:border-0">
              <Link href={`/blogs/${p.slug}/`} className="block py-5 no-underline">
                <span className="lab num">
                  {new Date(p.date).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  · {p.readingMinutes} min
                </span>
                <span className="mt-1.5 block font-display text-[clamp(20px,5.5vw,26px)] leading-snug">
                  {p.title}
                </span>
                <span className="mt-2 block max-w-[58ch] text-ash">{p.excerpt}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
