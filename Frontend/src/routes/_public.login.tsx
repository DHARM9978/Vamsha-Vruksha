import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/pages/auth/login";

export const Route = createFileRoute("/_public/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Vamsha Vruksha" },
      { name: "description", content: "Sign in to your Vamsha Vruksha family records, or use the demo accounts." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sign in — Vamsha Vruksha" },
      { property: "og:description", content: "Sign in to your family records, or step into the demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
