const prefetched = new Set<string>();

const ROUTE_IMPORTS: Record<string, () => Promise<unknown>> = {
  '/blog': () => import('../components/BlogPage'),
  '/transport-colis-europe-tunisie': () => import('../components/ParcelTransportPage'),
  '/signup': () => import('../components/DriverSignup'),
  '/client-signup': () => import('../components/ClientSignup'),
  '/login': () => import('../components/LoginSelection'),
  '/driver-login': () => import('../components/DriverLogin'),
  '/client-login': () => import('../components/ClientLogin'),
};

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const load = ROUTE_IMPORTS[path];
  if (!load) return;
  prefetched.add(path);
  void load();
}
