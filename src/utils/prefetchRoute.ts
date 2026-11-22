const prefetched = new Set<string>();

const ROUTE_IMPORTS: Record<string, () => Promise<unknown>> = {
  '/blog': () => import('../components/BlogPage'),
  '/a-propos': () => import('../components/AboutPage'),
  '/vtc-tunisie': () => import('../components/VtcTunisiePage'),
  '/transport-colis-europe-tunisie': () => import('../components/ParcelTransportPage'),
  '/livraison-colis-tunisie': () => import('../components/LocalParcelPage'),
  '/transport-groupes-tunisie': () => import('../components/GroupTravelPage'),
  '/signup': () => import('../components/DriverSignup'),
  '/client-signup': () => import('../components/ClientSignup'),
  '/login': () => import('../components/LoginScreen'),
  '/driver-login': () => import('../components/LoginScreen'),
  '/client-login': () => import('../components/LoginScreen'),
};

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const load = ROUTE_IMPORTS[path];
  if (!load) return;
  prefetched.add(path);
  void load();
}
