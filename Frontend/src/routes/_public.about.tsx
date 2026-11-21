import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/pages/public/about";

export const Route = createFileRoute("/_public/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About — Vamsha Vruksha" },
      {
        name: "description",
        content:
          "Vamsha Vruksha helps families record members, map relationships and carry cultural heritage forward.",
      },
      { property: "og:title", content: "About — Vamsha Vruksha" },
      {
        property: "og:description",
        content: "A calm, elegant home for your family's lineage and heritage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
