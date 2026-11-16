import { apiRequest } from './api';

type AnalyticsPayload = Record<string, unknown>;

const CACHE_TTL_MS = 15_000;

let cachedPayload: AnalyticsPayload | null = null;
let cachedAt = 0;
let inFlightRequest: Promise<AnalyticsPayload> | null = null;

export function invalidateDashboardAnalyticsCache(): void {
  cachedPayload = null;
  cachedAt = 0;
  inFlightRequest = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('codeprep:progress-updated', invalidateDashboardAnalyticsCache);
  window.addEventListener('codeprep:auth:logout', invalidateDashboardAnalyticsCache);
  window.addEventListener('codeprep:user-updated', invalidateDashboardAnalyticsCache);
}

/**
 * Deduplicates concurrent /analytics/dashboard calls across Navbar, Dashboard,
 * Problem List, Profile, and Mock Interview pages while keeping fresh data after solves.
 */
export async function fetchDashboardAnalytics<T = AnalyticsPayload>(force = false): Promise<T> {
  const now = Date.now();
  if (!force && cachedPayload && now - cachedAt < CACHE_TTL_MS) {
    return cachedPayload as T;
  }

  if (!inFlightRequest || force) {
    inFlightRequest = apiRequest<{ analytics?: AnalyticsPayload } & AnalyticsPayload>(
      '/analytics/dashboard'
    )
      .then((res) => {
        const normalized =
          res && typeof res === 'object' && res.analytics ? res.analytics : res || {};
        cachedPayload = normalized;
        cachedAt = Date.now();
        return normalized;
      })
      .finally(() => {
        inFlightRequest = null;
      });
  }

  return inFlightRequest as Promise<T>;
}
