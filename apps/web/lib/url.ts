/**
 * Gets the base URL for the application dynamically.
 * Works seamlessly across Server Components, SSR, and Client-side rendering.
 */
export const getAppUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    // Client-side fallback
    return window.location.origin;
  }

  // Fallback for SSR when environment variable isn't set
  return "http://localhost:3000";
};

/**
 * Gets the base URL for the API endpoint dynamically.
 */
export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const clean = process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/+$/, "");
    return clean.endsWith("/api/v1") ? clean : `${clean}/api/v1`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8123/api/v1`;
  }

  // Fallback for SSR
  return "http://localhost:8123/api/v1";
};

/**
 * Returns the single canonical public customer queue URL:
 * https://<domain>/q/<queueId>
 * Never embeds access tokens, session IDs, or private organizer data.
 */
export const getCustomerQueueUrl = (queueId: string): string => {
  const base = getAppUrl().replace(/\/+$/, "");
  return `${base}/q/${encodeURIComponent(queueId)}`;
};

/**
 * Resolves a destination link for Google Maps.
 * Prefers an explicit venueMapUrl, falling back to a structured Google Maps query for the venue name.
 * Returns null if neither is available.
 */
export const getGoogleMapsUrl = (options: {
  venue?: string | null;
  venueMapUrl?: string | null;
}): string | null => {
  const explicit = options.venueMapUrl?.trim();
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) {
      return explicit;
    }
    return `https://${explicit}`;
  }

  const venueName = options.venue?.trim();
  if (venueName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName)}`;
  }

  return null;
};

