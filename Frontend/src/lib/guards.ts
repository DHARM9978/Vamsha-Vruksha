import { redirect } from "@tanstack/react-router";

import { getSession } from "@/services/auth";
import type { Session } from "@/types";

/**
 * Client-side navigation guards for authenticated application routes.
 *
 * The /app parent route validates the JWT with GET /auth/me before rendering
 * the protected application area. These helpers provide route-level
 * navigation checks and a convenient cached session value.
 *
 * These checks are not an authorization boundary. The backend must continue
 * enforcing authentication and role permissions on every protected endpoint.
 */
export function requireSession(): Session {
  const session = getSession();

  if (!session) {
    throw redirect({ to: "/login" });
  }

  return session;
}

/**
 * Restricts the corresponding UI route to Admin sessions.
 * Backend Admin-only middleware remains authoritative for write operations.
 */
export function requireAdmin(): Session {
  const session = requireSession();

  if (session.role !== "admin") {
    throw redirect({ to: "/app" });
  }

  return session;
}
