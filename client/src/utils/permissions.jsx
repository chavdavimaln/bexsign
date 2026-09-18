import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';

/**
 * Permissions of the signed-in user, loaded from /api/permissions/me (role grants plus personal overrides).
 * usePermissions().can('reports.view') decides what the menu and pages show; the server enforces the same rules.
 */
const PermissionsContext = createContext({
  loading: true,
  role: null,
  permissions: [],
  can: () => true,
  refresh: () => {}
});

export function PermissionsProvider({ children }) {
  const [state, setState] = useState({ loading: true, role: null, permissions: [], error: '' });

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch('/permissions/me');
      setState({ loading: false, role: data.role, permissions: data.permissions || [], error: '' });
    } catch (err) {
      // Older server without the permission module: nothing is hidden
      setState({ loading: false, role: null, permissions: null, error: err.message });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    refresh,
    can: (key) => state.permissions === null || state.loading || (Array.isArray(state.permissions) && state.permissions.includes(key))
  }), [state, refresh]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export const usePermissions = () => useContext(PermissionsContext);
