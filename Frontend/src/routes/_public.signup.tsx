import { createFileRoute } from "@tanstack/react-router";
import { SignupPage } from "@/pages/auth/signup";

export const Route = createFileRoute("/_public/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Sign up — Vamsha Vruksha" },
      { name: "description", content: "Create your Vamsha Vruksha account and start your family's digital record." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Sign up — Vamsha Vruksha" },
      { property: "og:description", content: "Create your account and start your family's digital record." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
