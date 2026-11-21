import { createFileRoute } from "@tanstack/react-router";
import { ChangePasswordPage } from "@/pages/account/change-password";
import { useAppSession } from "@/lib/app-session";

export const Route = createFileRoute("/app/change-password")({
  component: () => {
    const { session } = useAppSession();
    return <ChangePasswordPage session={session} />;
  },
  head: () => ({
    meta: [
      { title: "Change Password — Vamsha Vruksha" },
      {
        name: "description",
        content: "Securely update your account password.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});