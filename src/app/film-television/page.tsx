import type { Metadata } from "next";
import { DisciplinePage } from "@/components/DisciplinePage";
import { DISCIPLINES } from "@/lib/site";

const discipline = DISCIPLINES.find((d) => d.slug === "film-television")!;

export const metadata: Metadata = {
  title: discipline.title,
  description: "Character and age makeup for screen, across Mumbai and Sydney.",
  alternates: { canonical: "/film-television/" },
};

export default function Page() {
  return <DisciplinePage discipline={discipline} />;
}
