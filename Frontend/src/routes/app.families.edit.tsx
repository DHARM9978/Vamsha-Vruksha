import { createFileRoute } from "@tanstack/react-router";
import { EditFamilyPage } from "@/pages/families/edit-family";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/app/families/edit")({
  beforeLoad: () => requireAdmin(),
  component: EditFamilyPage,
  head: () => ({
    meta: [
      { title: "Edit Family — Vamsha Vruksha" },
      { name: "description", content: "Search for a family and update its details, head person and heritage attributes." },
      { name: "robots", content: "noindex" },
    ],
  }),
});
