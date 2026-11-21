import { createFileRoute } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/pages/auth/forgot-password";

export const Route = createFileRoute("/_public/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Forgot password — Vamsha Vruksha" },
      { name: "description", content: "Reset your Vamsha Vruksha password with a six-digit verification code." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Forgot password — Vamsha Vruksha" },
      { property: "og:description", content: "Reset your password with a six-digit verification code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
