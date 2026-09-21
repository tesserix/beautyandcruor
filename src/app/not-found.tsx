import Link from "next/link";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <Chrome />
      <main
        style={{ paddingTop: "var(--hud)", paddingInline: "var(--gut)" }}
        className="flex min-h-[60svh] flex-col justify-center pb-20"
      >
        <p className="lab">404</p>
        <h1 className="mt-2 font-display text-[clamp(30px,8vw,48px)] leading-tight font-600">
          That page isn&rsquo;t here
        </h1>
        <p className="mt-4 max-w-[46ch] text-ash">
          It may have moved when the site was rebuilt.
        </p>
        <Link href="/" className="lab mt-6 text-chalk underline underline-offset-4">
          Back to the work
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
