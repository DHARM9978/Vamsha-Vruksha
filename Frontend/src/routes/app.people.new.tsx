import { createFileRoute } from "@tanstack/react-router";
import { AddPersonPage } from "@/pages/people/add-person";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/app/people/new")({
  beforeLoad: () => requireAdmin(),
  component: AddPersonPage,
  head: () => ({
    meta: [
      { title: "Add Person — Vamsha Vruksha" },
      { name: "description", content: "Add a family member with personal, contact and heritage details." },
      { name: "robots", content: "noindex" },
    ],
  }),
});
