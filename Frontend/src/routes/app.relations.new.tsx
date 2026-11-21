import { createFileRoute } from "@tanstack/react-router";
import { AddRelationPage } from "@/pages/relationships/add-relation";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/app/relations/new")({
  beforeLoad: () => requireAdmin(),
  component: AddRelationPage,
  head: () => ({
    meta: [
      { title: "Add Relation — Vamsha Vruksha" },
      { name: "description", content: "Connect two people with a relationship and preview it before saving." },
      { name: "robots", content: "noindex" },
    ],
  }),
});
