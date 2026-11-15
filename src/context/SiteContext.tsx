import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SITE_CONFIG } from '../data/defaultSiteConfig';
import { AdminAuthRecord, SiteConfig } from '../types/site';
import { sha256Hex } from '../utils/crypto';

const SITE_STORAGE_KEY = 'smd_site_config_v1';
const AUTH_STORAGE_KEY = 'smd_admin_auth_v1';
const SESSION_STORAGE_KEY = 'smd_admin_session_v1';

const DEFAULT_USER_ID = 'admin';
const DEFAULT_PASSWD = 'spotify123';

export type AppRoute = '/' | '/adminlogin' | '/admin';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface SiteContextValue {
  config: SiteConfig;
  route: AppRoute;
  isAuthenticated: boolean;
  isDefaultAuth: boolean;
  adminUserId: string;
  toasts: ToastMessage[];
  navigate: (path: AppRoute) => void;
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  updateConfig: (next: SiteConfig) => void;
  resetConfig: () => void;
  exportConfigJson: () => void;
  importConfigJson: (rawJson: string) => { ok: boolean; message: string };
  login: (userId: string, passwd: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateCredentials: (
    currentPasswd: string,
    newUserId: string,
    newPasswd: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

const SiteContext = createContext<SiteContextValue | null>(null);

function normalizeRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/adminlogin') return '/adminlogin';
  if (clean === '/admin') return '/admin';
  return '/';
}

function resolveHeroImage(url?: string): string {
  if (!url || url === '/assets/hero_music_studio_1794590606487-DxlthElx.jpg') {
    return DEFAULT_SITE_CONFIG.hero.heroImageUrl;
  }
  return url;
}

function loadInitialConfig(): SiteConfig {
  if (typeof window === 'undefined') return DEFAULT_SITE_CONFIG;
  try {
    const raw = window.localStorage.getItem(SITE_STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SiteConfig>;
    if (!parsed || !Array.isArray(parsed.playlists) || !parsed.brand || !parsed.hero || !parsed.theme) {
      return DEFAULT_SITE_CONFIG;
    }
    return {
      ...DEFAULT_SITE_CONFIG,
      ...parsed,
      brand: { ...DEFAULT_SITE_CONFIG.brand, ...parsed.brand },
      hero: {
        ...DEFAULT_SITE_CONFIG.hero,
        ...parsed.hero,
        heroImageUrl: resolveHeroImage(parsed.hero.heroImageUrl),
      },
      curator: { ...DEFAULT_SITE_CONFIG.curator, ...(parsed.curator || {}) },
      theme: { ...DEFAULT_SITE_CONFIG.theme, ...parsed.theme },
      playlists: parsed.playlists,
    };
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

function loadStoredAuth(): AdminAuthRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminAuthRecord;
    if (parsed?.userId && parsed?.passwordHash) return parsed;
    return null;
  } catch {
    return null;
  }
}

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SiteConfig>(() => loadInitialConfig());
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window !== 'undefined' ? normalizeRoute(window.location.pathname) : '/'
  );
  const [storedAuth, setStoredAuth] = useState<AdminAuthRecord | null>(() => loadStoredAuth());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) === 'authenticated';
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Optional static site-config.json hydration when no localStorage edits exist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasLocal = Boolean(window.localStorage.getItem(SITE_STORAGE_KEY));
    if (hasLocal) return;

    fetch('/site-config.json', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.playlists) && data.brand && data.hero && data.theme) {
          setConfig((prev) => ({
            ...prev,
            ...data,
            brand: { ...prev.brand, ...data.brand },
            hero: {
              ...prev.hero,
              ...data.hero,
              heroImageUrl: resolveHeroImage(data.hero.heroImageUrl),
            },
            curator: { ...prev.curator, ...(data.curator || {}) },
            theme: { ...prev.theme, ...data.theme },
            playlists: data.playlists,
          }));
        }
      })
      .catch(() => {
        // Static /site-config.json is optional; default bundled config remains active
      });
  }, []);

  // Sync browser document title & CSS accent variable
  useEffect(() => {
    document.title = `${config.brand.domainName} — Curated Playlists`;
    document.documentElement.style.setProperty('--accent-color', config.theme.accentColor || '#1DB954');
  }, [config.brand.domainName, config.theme.accentColor]);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const navigate = useCallback((path: AppRoute) => {
    const target = normalizeRoute(path);
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setRoute(target);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const updateConfig = useCallback((next: SiteConfig) => {
    setConfig(next);
    try {
      window.localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_SITE_CONFIG);
    window.localStorage.removeItem(SITE_STORAGE_KEY);
    showToast('Restored default showcase configuration', 'info');
  }, [showToast]);

  const exportConfigJson = useCallback(() => {
    const payload = JSON.stringify(config, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'site-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported site-config.json bundle');
  }, [config, showToast]);

  const importConfigJson = useCallback(
    (rawJson: string): { ok: boolean; message: string } => {
      try {
        const parsed = JSON.parse(rawJson) as Partial<SiteConfig>;
        if (!parsed || !Array.isArray(parsed.playlists) || !parsed.brand || !parsed.hero || !parsed.theme) {
          return {
            ok: false,
            message: 'Invalid bundle: missing brand, hero, theme, or playlists array.',
          };
        }
        const merged: SiteConfig = {
          ...DEFAULT_SITE_CONFIG,
          ...parsed,
          brand: { ...DEFAULT_SITE_CONFIG.brand, ...parsed.brand },
          hero: {
            ...DEFAULT_SITE_CONFIG.hero,
            ...parsed.hero,
            heroImageUrl: resolveHeroImage(parsed.hero.heroImageUrl),
          },
          curator: { ...DEFAULT_SITE_CONFIG.curator, ...(parsed.curator || {}) },
          theme: { ...DEFAULT_SITE_CONFIG.theme, ...parsed.theme },
          playlists: parsed.playlists,
        };
        updateConfig(merged);
        showToast('Imported configuration successfully');
        return { ok: true, message: 'Configuration imported and applied.' };
      } catch {
        return { ok: false, message: 'Could not parse JSON file. Please verify the syntax.' };
      }
    },
    [showToast, updateConfig]
  );

  const login = useCallback(
    async (userIdInput: string, passwdInput: string): Promise<{ ok: boolean; error?: string }> => {
      const cleanUser = userIdInput.trim();
      if (!cleanUser || !passwdInput) {
        return { ok: false, error: 'Please enter both User ID and Password.' };
      }

      const incomingHash = await sha256Hex(passwdInput);
      const expectedUser = storedAuth?.userId ?? DEFAULT_USER_ID;
      const expectedHash = storedAuth?.passwordHash ?? (await sha256Hex(DEFAULT_PASSWD));

      if (cleanUser !== expectedUser || incomingHash !== expectedHash) {
        return { ok: false, error: 'Invalid User ID or Password.' };
      }

      window.sessionStorage.setItem(SESSION_STORAGE_KEY, 'authenticated');
      setIsAuthenticated(true);
      return { ok: true };
    },
    [storedAuth]
  );

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsAuthenticated(false);
    navigate('/adminlogin');
    showToast('Signed out of admin studio', 'info');
  }, [navigate, showToast]);

  const updateCredentials = useCallback(
    async (
      currentPasswd: string,
      newUserId: string,
      newPasswd: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const cleanUser = newUserId.trim();
      if (cleanUser.length < 3) {
        return { ok: false, error: 'New User ID must be at least 3 characters.' };
      }
      if (newPasswd.length < 6) {
        return { ok: false, error: 'New Password must be at least 6 characters.' };
      }

      const currentHash = await sha256Hex(currentPasswd);
      const expectedHash = storedAuth?.passwordHash ?? (await sha256Hex(DEFAULT_PASSWD));

      if (currentHash !== expectedHash) {
        return { ok: false, error: 'Current password is incorrect.' };
      }

      const nextHash = await sha256Hex(newPasswd);
      const record: AdminAuthRecord = {
        userId: cleanUser,
        passwordHash: nextHash,
        updatedAt: new Date().toISOString(),
      };

      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(record));
      setStoredAuth(record);
      showToast('Admin credentials updated');
      return { ok: true };
    },
    [showToast, storedAuth]
  );

  const value = useMemo<SiteContextValue>(
    () => ({
      config,
      route,
      isAuthenticated,
      isDefaultAuth: storedAuth === null,
      adminUserId: storedAuth?.userId ?? DEFAULT_USER_ID,
      toasts,
      navigate,
      showToast,
      updateConfig,
      resetConfig,
      exportConfigJson,
      importConfigJson,
      login,
      logout,
      updateCredentials,
    }),
    [
      config,
      route,
      isAuthenticated,
      storedAuth,
      toasts,
      navigate,
      showToast,
      updateConfig,
      resetConfig,
      exportConfigJson,
      importConfigJson,
      login,
      logout,
      updateCredentials,
    ]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};

export function useSite(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSite must be used inside SiteProvider');
  }
  return ctx;
}
