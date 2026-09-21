import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { PostImage } from "@/components/Picture";
import { getAllPosts, getPost } from "@/lib/posts";
import { SITE } from "@/lib/site";

/** Fully enumerated at build time — the export contains no dynamic route. */
export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blogs/${post.slug}/` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      url: `${SITE.url}/blogs/${post.slug}/`,
    },
  };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <>
      <Chrome />
      <main style={{ paddingTop: "var(--hud)", paddingInline: "var(--gut)" }} className="pt-10 pb-20">
        <article className="mx-auto max-w-[720px]">
          <p className="lab num">
            {new Date(post.date).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {post.readingMinutes} min read
          </p>
          <h1 className="mt-3 font-display text-[clamp(28px,7vw,44px)] leading-[1.06] font-600">
            {post.title}
          </h1>
          <div className="prose-bac mt-8 grid gap-5 text-[16px] leading-[1.7] text-ash">
            <MDXRemote source={post.body} components={{ PostImage }} />
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
