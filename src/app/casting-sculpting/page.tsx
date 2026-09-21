import type { Metadata } from "next";
import { DisciplinePage } from "@/components/DisciplinePage";
import { DISCIPLINES } from "@/lib/site";

const discipline = DISCIPLINES.find((d) => d.slug === "casting-sculpting")!;

export const metadata: Metadata = {
  title: discipline.title,
  description: "Lifecasting, clay and relief work, mould-making and 3D-printed appliance cores.",
  alternates: { canonical: "/casting-sculpting/" },
};

export default function Page() {
  return <DisciplinePage discipline={discipline} />;
}
