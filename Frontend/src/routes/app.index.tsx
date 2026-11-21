import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/pages/overview/overview";
import { useAppSession } from "@/lib/app-session";

export const Route = createFileRoute("/app/")({
  component: OverviewRoute,
  head: () => ({
    meta: [
      { title: "Overview — Vamsha Vruksha" },
      { name: "description", content: "Your family records at a glance: families, people, relationships and activity." },
      { property: "og:title", content: "Overview — Vamsha Vruksha" },
      { property: "og:description", content: "Your family records at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function OverviewRoute() {
  const { session } = useAppSession();
  return <OverviewPage session={session} />;
}
