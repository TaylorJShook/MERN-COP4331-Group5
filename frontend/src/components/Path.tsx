export function buildPath(route: string): string {
  const isDev = import.meta.env.DEV; // true when running `npm run dev`
  const baseUrl = isDev
    ? import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    : import.meta.env.VITE_API_URL || 'https://cop4331-group5.xyz';

  // Ensure route doesn't have a duplicate "/api/"
  const cleanedRoute = route.replace(/^\/?api\//, '');
  return `${baseUrl.replace(/\/$/, '')}/api/${cleanedRoute}`;
}
