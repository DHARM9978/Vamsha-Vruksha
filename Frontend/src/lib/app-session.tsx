
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { AppOutletContext } from "@/types";

// ======================================================
// APP SESSION CONTEXT
// ======================================================

export const AppSessionContext =
  createContext<AppOutletContext | null>(null);

// ======================================================
// SESSION PROVIDER
// ======================================================

interface AppSessionProviderProps {
  value: AppOutletContext;
  children: ReactNode;
}

export function AppSessionProvider({
  value,
  children,
}: AppSessionProviderProps) {
  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
}

// ======================================================
// USE APP SESSION
// ======================================================

export function useAppSession(): AppOutletContext {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error(
      "useAppSession must be used inside AppSessionProvider."
    );
  }

  return context;
}
