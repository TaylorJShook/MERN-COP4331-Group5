export function buildPath(route: string): string {
  const isDev = import.meta.env.DEV; // true when running `npm run dev`

  // Use full URL in dev, but relative path in production
  const baseUrl = isDev
    ? import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    : ''; // relative path in production

  // Ensure route doesn't have a duplicate "/api/"
  const cleanedRoute = route.replace(/^\/?api\//, '');
  return `${baseUrl.replace(/\/$/, '')}/api/${cleanedRoute}`;
}
