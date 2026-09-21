import type { Metadata } from "next";
import { DisciplinePage } from "@/components/DisciplinePage";
import { DISCIPLINES } from "@/lib/site";

const discipline = DISCIPLINES.find((d) => d.slug === "sfx-prosthetics")!;

export const metadata: Metadata = {
  title: discipline.title,
  description: "Trauma, burns, creature builds and age work for film, television and stage. Appliances sculpted, moulded and run in-house.",
  alternates: { canonical: "/sfx-prosthetics/" },
};

export default function Page() {
  return <DisciplinePage discipline={discipline} />;
}
