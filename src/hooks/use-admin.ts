import { useState, useCallback } from 'react';

const STORAGE_KEY = 'admin_password';

export function useAdmin() {
  const [password, setPasswordState] = useState<string | null>(
    () => sessionStorage.getItem(STORAGE_KEY)
  );

  const login = useCallback((pw: string) => {
    sessionStorage.setItem(STORAGE_KEY, pw);
    setPasswordState(pw);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPasswordState(null);
  }, []);

  return { password, isAuthenticated: !!password, login, logout };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function adminFetch(
  path: string,
  password: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-nodes${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'x-admin-password': password,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}
