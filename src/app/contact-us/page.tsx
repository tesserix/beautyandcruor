import type { Metadata } from "next";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { EnquiryForm } from "@/components/EnquiryForm";
import { SITE, LOCATIONS } from "@/lib/site";
import { JsonLd, breadcrumbSchema } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Production bookings, prosthetic commissions and editorial. Sydney and Mumbai.",
  alternates: { canonical: "/contact-us/" },
};

export default function Contact() {
  return (
    <>
      <Chrome />
      <main id="main" style={{ paddingTop: "var(--hud)" }}>
        <div className="wrap pt-10 pb-20">
        <p className="lab">Contact</p>
        <h1 className="mt-2 font-display text-[clamp(32px,9vw,56px)] leading-[1.02] font-600">
          Enquire
        </h1>
        <p className="mt-4 max-w-[52ch] text-ash">
          Production bookings, prosthetic commissions and editorial.
        </p>

        {/* TODO(client): a phone number belongs here, above the form.
            Nobody on a production books through a web form. */}

        <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] md:gap-16">
          <EnquiryForm />
          <div className="grid content-start gap-3">
            {LOCATIONS.map((l) => (
              <div key={l.city} className="border-l-2 border-leaf pl-4">
                <h2 className="font-display text-[19px] font-600">{l.city}</h2>
                <p className="mt-0.5 text-[14px] text-ash">
                  {l.region} · {l.countryName}
                </p>
              </div>
            ))}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={SITE.imdb} target="_blank" rel="noopener"
                 className="btn-out lab flex-1 min-w-[130px]">
                IMDb ↗
              </a>
              <a href={SITE.instagram} target="_blank" rel="noopener"
                 className="btn-out lab flex-1 min-w-[130px]">
                Instagram ↗
              </a>
            </div>
          </div>
        </div>
        </div>
      </main>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact-us/" },
          ]),
        ]}
      />
      <SiteFooter />
    </>
  );
}
