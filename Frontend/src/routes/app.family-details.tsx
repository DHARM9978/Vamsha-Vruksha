import { createFileRoute } from "@tanstack/react-router";
import { FamilyDetailsPage } from "@/pages/family-details/family-details-page";

export const Route = createFileRoute("/app/family-details")({
  validateSearch: (search: Record<string, unknown>) => ({
   person:
  typeof search["person"] === "string"
    ? search["person"]
    : undefined,
  }),
  component: FamilyDetailsPage,
  head: () => ({
    meta: [
      { title: "Family Details — Vamsha Vruksha" },
      { name: "description", content: "View a family branch's heritage summary and hierarchy, with table and tree views." },
      { property: "og:title", content: "Family Details — Vamsha Vruksha" },
      { property: "og:description", content: "View a family branch's summary, heritage and hierarchy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
