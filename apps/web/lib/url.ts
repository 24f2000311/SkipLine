/**
 * Gets the base URL for the application dynamically.
 * Works seamlessly across Server Components, SSR, and Client-side rendering.
 */
export const getAppUrl = () => {
  if (typeof window !== "undefined") {
    // Client-side: robust and absolute
    return window.location.origin;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fallback for SSR when environment variable isn't set
  return "http://localhost:3000";
};

/**
 * Gets the base URL for the API endpoint dynamically.
 */
export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8123/api/v1`;
  }

  // Fallback for SSR
  return "http://localhost:8123/api/v1";
};
