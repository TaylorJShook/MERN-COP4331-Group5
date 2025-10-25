export function buildPath(route: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Remove accidental double "api" if present in route
  const cleanedRoute = route.replace(/^\/?api\//, '');
  return `${baseUrl.replace(/\/$/, '')}/api/${cleanedRoute}`;
}
