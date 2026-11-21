import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/pages/public/contact";

export const Route = createFileRoute("/_public/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact — Vamsha Vruksha" },
      {
        name: "description",
        content:
          "Have questions about Vamsha Vruksha? Get in touch with our team.",
      },
      { property: "og:title", content: "Contact — Vamsha Vruksha" },
      {
        property: "og:description",
        content: "Get in touch with the Vamsha Vruksha team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});