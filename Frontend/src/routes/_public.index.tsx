import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/pages/public/landing";

export const Route = createFileRoute("/_public/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Vamsha Vruksha — Discover Your Family Heritage" },
      {
        name: "description",
        content:
          "Preserve your family's lineage: manage members, relationships and heritage details, and explore an interactive family tree.",
      },
      { property: "og:title", content: "Vamsha Vruksha — Discover Your Family Heritage" },
      {
        property: "og:description",
        content: "A calm, elegant home for your family tree, members, relationships and heritage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
