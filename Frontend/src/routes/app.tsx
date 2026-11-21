import {
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AppSessionProvider } from "@/lib/app-session";
import {
  api,
  tokenStorage,
  type ApiResponse,
} from "@/lib/api-client";
import { getSession, signOut } from "@/services/auth";
import type { Role, Session } from "@/types";

type BackendRole = "Admin" | "User";

interface BackendUser {
  userId: number | string;
  userName: string;
  email: string;
  phone: string | null;
  role: BackendRole;
}

interface CurrentUserResponse {
  user: BackendUser;
}

function mapBackendRole(role: BackendRole): Role {
  switch (role) {
    case "Admin":
      return "admin";
    case "User":
      return "user";
    default:
      throw new Error("The server returned an unsupported user role.");
  }
}

function clearInvalidSession(): void {
  try {
    signOut();
  } catch {
    // Always clear the authentication token, even if session storage fails.
    tokenStorage.clear();
  }
}

/**
 * Validate the cached JWT against the backend before rendering /app.
 * The backend's /auth/me endpoint is the source of truth for the user and role.
 */
async function validateSession(): Promise<Session> {
  if (!tokenStorage.get()) {
    clearInvalidSession();
    throw redirect({ to: "/login" });
  }

  const cachedSession = getSession();

  let response: ApiResponse<CurrentUserResponse>;

  try {
    response = await api.get<ApiResponse<CurrentUserResponse>>(
      "/auth/me",
    );
  } catch {
    clearInvalidSession();
    throw redirect({ to: "/login" });
  }

  if (!response.success || !response.data?.user) {
    clearInvalidSession();
    throw redirect({ to: "/login" });
  }

  const user = response.data.user;

  let role: Role;

  try {
    role = mapBackendRole(user.role);
  } catch {
    clearInvalidSession();
    throw redirect({ to: "/login" });
  }

  return {
    userId: String(user.userId),
    fullName: user.userName,
    email: user.email,
    mobile: user.phone ?? "",
    role,
    signedInAt:
      cachedSession?.signedInAt ?? new Date().toISOString(),
  };
}

export const Route = createFileRoute("/app")({
  ssr: false,

  beforeLoad: async () => {
    const session = await validateSession();

    return { session };
  },

  component: AppLayout,
});

function AppLayout() {
  const { session: initialSession } = Route.useRouteContext();
  const [session, setSession] = useState<Session>(initialSession);

  return (
    <AppSessionProvider
      value={{
        session,
        setSession,
      }}
    >
      <AppShell session={session} />
    </AppSessionProvider>
  );
}
