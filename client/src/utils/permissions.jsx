import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from './api';

/**
 * Permissions of the signed-in user, loaded from /api/permissions/me (role grants plus personal overrides).
 * usePermissions().can('reports.view') decides what the menu and pages show; the server enforces the same rules.
 *
 * Nothing counts as allowed until the user's permissions are loaded. They are loaded again every minute and when
 * the window gets focus, so a change an administrator makes in Roles & permissions reaches a signed-in user
 * without signing out.
 */
const REFRESH_MS = 60 * 1000;

const PermissionsContext = createContext({
  loading: true,
  role: null,
  permissions: [],
  can: () => false,
  refresh: () => {}
});

export function PermissionsProvider({ children }) {
  const [state, setState] = useState({ loading: true, role: null, permissions: [], error: '' });
  const lastLoad = useRef(0);

  const refresh = useCallback(async () => {
    lastLoad.current = Date.now();
    try {
      const data = await apiFetch('/permissions/me');
      setState({ loading: false, role: data.role, permissions: Array.isArray(data.permissions) ? data.permissions : [], error: '' });
    } catch (err) {
      // Keep what was loaded before (a network hiccup must not change the menu); nothing extra is allowed
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onFocus = () => {
      if (Date.now() - lastLoad.current > 5000) refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  const value = useMemo(() => {
    const granted = new Set(state.permissions || []);
    return {
      ...state,
      refresh,
      can: (key) => granted.has(key),
      canAny: (keys) => [].concat(keys).some((key) => granted.has(key))
    };
  }, [state, refresh]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export const usePermissions = () => useContext(PermissionsContext);
