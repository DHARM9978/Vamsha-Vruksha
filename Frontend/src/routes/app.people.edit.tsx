import { createFileRoute } from "@tanstack/react-router";
import { EditPersonPage } from "@/pages/people/edit-person";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/app/people/edit")({
  beforeLoad: () => requireAdmin(),
  component: EditPersonPage,
  head: () => ({
    meta: [
      { title: "Edit Person — Vamsha Vruksha" },
      { name: "description", content: "Find a family member and update their details and heritage attributes." },
      { name: "robots", content: "noindex" },
    ],
  }),
});
