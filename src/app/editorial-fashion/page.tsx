import type { Metadata } from "next";
import { DisciplinePage } from "@/components/DisciplinePage";
import { DISCIPLINES } from "@/lib/site";

const discipline = DISCIPLINES.find((d) => d.slug === "editorial-fashion")!;

export const metadata: Metadata = {
  title: discipline.title,
  description: "Body art, beauty and fashion editorial, underwater and studio.",
  alternates: { canonical: "/editorial-fashion/" },
};

export default function Page() {
  return <DisciplinePage discipline={discipline} />;
}
