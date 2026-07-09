import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'driver' | 'client';

export async function resolveUserRole(userId: string): Promise<UserRole | null> {
  const [adminRes, driverRes, clientRes] = await Promise.all([
    supabase.from('admin_users').select('id').eq('id', userId).maybeSingle(),
    supabase.from('drivers').select('id').eq('id', userId).maybeSingle(),
    supabase.from('clients').select('id').eq('id', userId).maybeSingle(),
  ]);

  if (adminRes.error) console.error('resolveUserRole admin:', adminRes.error.message);
  if (driverRes.error) console.error('resolveUserRole driver:', driverRes.error.message);
  if (clientRes.error) console.error('resolveUserRole client:', clientRes.error.message);

  if (adminRes.data) return 'admin';
  if (driverRes.data) return 'driver';
  if (clientRes.data) return 'client';
  return null;
}

export const PUBLIC_PATHS = new Set([
  '/',
  '/signup',
  '/client-signup',
  '/login',
  '/driver-login',
  '/client-login',
  '/privacy-policy',
  '/terms-of-service',
  '/transport-colis-europe-tunisie',
  '/vtc-tunisie',
  '/reset-password',
  '/blog',
  '/a-propos',
]);

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path) || path.startsWith('/blog/');
}

const PROTECTED_PATHS = new Set(['/dashboard', '/client-dashboard', '/admin-dashboard']);

export function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.has(path);
}
