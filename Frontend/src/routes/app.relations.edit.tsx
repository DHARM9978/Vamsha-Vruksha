import { createFileRoute } from "@tanstack/react-router";
import { EditRelationPage } from "@/pages/relationships/edit-relation";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/app/relations/edit")({
  beforeLoad: () => requireAdmin(),

  component: EditRelationPage,

  head: () => ({
    meta: [
      {
        title: "Edit Relationship — Vamsha Vruksha",
      },
      {
        name: "description",
        content:
          "Review, edit or remove existing family relationships while keeping reverse relationships synchronized.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
});