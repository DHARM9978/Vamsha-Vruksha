import { createFileRoute } from "@tanstack/react-router";
import { AddUserPage } from "@/pages/users/add-user";
import { requireAdmin } from "@/lib/guards";

export const Route = createFileRoute("/app/users/new")({
  beforeLoad: () => requireAdmin(),
  component: AddUserPage,
  head: () => ({
    meta: [
      { title: "Add Admin/User — Vamsha Vruksha" },
      {
        name: "description",
        content: "Create and manage administrator and user accounts.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});