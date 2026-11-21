/**
 * Legacy demo-data repository retired.
 *
 * Application data is now read and written through the authenticated backend
 * API. This module remains temporarily as a compatibility boundary for
 * services/auth.ts, which still re-exports resetDemoData.
 *
 * It intentionally does not seed, cache, or mutate demo records.
 */

/**
 * Clears the old demo-data cache from this browser.
 *
 * This is a cleanup-only compatibility function; it does not reset or modify
 * any backend records.
 */
export function resetDemoData(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem("vv.demo.data.v1");
  } catch {
    // Storage may be unavailable; there is no server-side data to reset.
  }
}