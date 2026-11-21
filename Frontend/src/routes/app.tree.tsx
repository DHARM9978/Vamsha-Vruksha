import { createFileRoute } from "@tanstack/react-router";
import { TreePage } from "@/pages/tree/tree-page";

export const Route = createFileRoute("/app/tree")({
  component: TreePage,
  head: () => ({
    meta: [
      { title: "Family Tree — Vamsha Vruksha" },
      { name: "description", content: "Explore family relationships on an interactive tree with pan, zoom and node details." },
      { property: "og:title", content: "Family Tree — Vamsha Vruksha" },
      { property: "og:description", content: "Explore family relationships on an interactive tree." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
