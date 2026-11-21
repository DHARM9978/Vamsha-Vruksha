import { createFileRoute } from "@tanstack/react-router";
import { CreateFamilyPage } from "@/pages/families/create-family";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/app/families/new")({
  beforeLoad: () => requireAdmin(),
  component: CreateFamilyPage,
  head: () => ({
    meta: [
      { title: "Create Family — Vamsha Vruksha" },
      { name: "description", content: "Register a new family with its head person and heritage details." },
      { name: "robots", content: "noindex" },
    ],
  }),
});
