import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/pages/account/profile";
import { useAppSession } from "@/lib/app-session";

export const Route = createFileRoute("/app/profile")({
  component: ProfileRoute,
  head: () => ({
    meta: [
      { title: "Profile — Vamsha Vruksha" },
      { name: "description", content: "Your account details. Email is read-only." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ProfileRoute() {
  const { session, setSession } = useAppSession();
  return <ProfilePage session={session} onSessionChange={setSession} />;
}
