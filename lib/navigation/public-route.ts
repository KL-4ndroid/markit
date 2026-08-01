export const STANDALONE_PUBLIC_ROUTES = [
  '/demo',
  '/support',
  '/terms',
  '/privacy',
  '/about',
] as const;

export const AUTH_FLOW_PUBLIC_ROUTES = ['/join'] as const;

export function isPathWithinRoute(pathname: string | null, route: string): boolean {
  return pathname === route || pathname?.startsWith(`${route}/`) === true;
}

export function isPathWithinAnyRoute(
  pathname: string | null,
  routes: readonly string[],
): boolean {
  return routes.some(route => isPathWithinRoute(pathname, route));
}
