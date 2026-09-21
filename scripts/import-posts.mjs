/**
 * Pulls the two blog posts from the live WordPress REST API and writes them as
 * MDX with frontmatter. Run once while the old site is still up; after that the
 * MDX files in src/content/posts are the source of truth.
 */
import TurndownService from 'turndown';
import { writeFile, mkdir } from 'node:fs/promises';

const ORIGIN = 'https://beautyandcruor.com';
const OUT = 'src/content/posts';

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
});
// WordPress wraps figures and captions in markup that turns into noise
td.addRule('figure', {
  filter: 'figure',
  replacement: (content, node) => {
    const img = node.querySelector?.('img');
    const cap = node.querySelector?.('figcaption')?.textContent?.trim();
    if (!img) return content;
    const alt = (img.getAttribute('alt') || cap || '').replace(/"/g, "'");
    return `\n\n![${alt}](${img.getAttribute('src')})\n\n`;
  },
});

const ents = (s) => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&lsquo;/g, "'")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, '…').replace(/&mdash;/g, '—');

const yaml = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const res = await fetch(`${ORIGIN}/wp-json/wp/v2/posts?per_page=100&_embed=1`);
if (!res.ok) throw new Error(`wp-json returned ${res.status}`);
const posts = await res.json();
await mkdir(OUT, { recursive: true });

console.log(`${posts.length} posts\n`);
for (const p of posts) {
  const title = ents(p.title.rendered).trim();
  const html = p.content.rendered;
  let body = td.turndown(html);

  // Rewrite every image to the local pipeline key. Sources point at Jetpack's
  // CDN (i0.wp.com/...?resize=) or at wp-content directly; both die with the
  // old site, and both resolve to a file we already hold in capture/assets.
  body = body.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (m, alt, url) => {
      const hit = url.match(/wp-content\/uploads\/([^?)\s]+)/);
      if (!hit) return m;
      const key = hit[1].replace(/\.[^.]+$/, '');
      return `<PostImage imageKey="${key}" alt="${alt.replace(/"/g, "'")}" />`;
    }
  );

  // strip WP's trailing "The post X appeared first on Y" and empty artifacts
  body = body
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*The post .*appeared first on.*$/gim, '')
    .trim();

  const excerpt = ents(p.excerpt.rendered.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  const hero = p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null;

  const fm = [
    '---',
    `title: ${yaml(title)}`,
    `slug: ${yaml(p.slug)}`,
    `date: ${yaml(p.date)}`,
    `excerpt: ${yaml(excerpt.slice(0, 260))}`,
    hero ? `heroKey: ${yaml((hero.split('/wp-content/uploads/')[1] ?? hero).replace(/\.[^.]+$/, ''))}` : '# heroKey: the original post had no featured image',
    `wpId: ${p.id}`,
    '---',
    '',
  ].join('\n');

  const file = `${OUT}/${p.slug}.mdx`;
  await writeFile(file, fm + body + '\n');
  console.log(`  ${file}`);
  console.log(`    ${title}`);
  console.log(`    ${body.split(/\s+/).length} words, ${(body.match(/^#+ /gm) || []).length} headings\n`);
}
