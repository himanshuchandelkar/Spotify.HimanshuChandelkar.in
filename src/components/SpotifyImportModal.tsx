import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, RefreshCw, Unplug, UserCheck, X } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { Playlist } from '../types/site';
import { getContrastTextColor } from '../utils/crypto';
import {
  buildSpotifyAuthorizeUrl,
  clearSpotifyToken,
  exchangeSpotifyPkceCode,
  fetchSpotifyPlaylists,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyProfile,
  getSavedSpotifyToken,
  getSpotifyRedirectUri,
  mapSpotifySummaryToPlaylist,
  SpotifyPlaylistSummary,
  SpotifyUserProfile,
} from '../utils/spotifyPkce';
import { IconGlyph } from './IconGlyph';
import { ResilientImage } from './ResilientImage';

const CLIENT_ID_STORAGE_KEY = 'smd_spotify_client_id_v1';

interface SpotifyImportModalProps {
  open: boolean;
  accentColor: string;
  onClose: () => void;
  onSyncProfile: (profile: SpotifyUserProfile) => void;
  onImportPlaylists: (imported: Playlist[]) => void;
}

export const SpotifyImportModal: React.FC<SpotifyImportModalProps> = ({
  open,
  accentColor,
  onClose,
  onSyncProfile,
  onImportPlaylists,
}) => {
  const { showToast } = useSite();
  const envClientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) || '';
  const hasEnvClientId = Boolean(envClientId && envClientId !== 'MY_SPOTIFY_CLIENT_ID');

  const [clientId, setClientId] = useState<string>(() => {
    if (hasEnvClientId) return envClientId;
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '';
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => getSavedSpotifyToken());
  const [profile, setProfile] = useState<SpotifyUserProfile | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importMood, setImportMood] = useState<string>('Curated');

  const [connecting, setConnecting] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [importing, setImporting] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exchangeInFlightRef = useRef(false);
  const redirectUri = getSpotifyRedirectUri();
  const accentText = getContrastTextColor(accentColor);

  const loadLibrary = async (token: string) => {
    setLoadingLibrary(true);
    setError(null);
    try {
      const [me, list] = await Promise.all([
        fetchSpotifyProfile(token),
        fetchSpotifyPlaylists(token),
      ]);
      setProfile(me);
      setPlaylists(list);
      if (list.length > 0) {
        setSelectedIds(new Set(list.slice(0, 3).map((p) => p.id)));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load your Spotify library.';
      setError(message);
      clearSpotifyToken();
      setAccessToken(null);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (accessToken && !profile) {
      loadLibrary(accessToken);
    }
  }, [open, accessToken]);

  useEffect(() => {
    if (!open) return;
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      const isAllowedOrigin =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost');
      if (!isAllowedOrigin) return;

      const payload = event.data as {
        type?: string;
        code?: string | null;
        state?: string | null;
        error?: string | null;
      };
      if (payload?.type !== 'SPOTIFY_PKCE_CALLBACK') return;

      if (payload.error) {
        setConnecting(false);
        setError(`Spotify authorization declined (${payload.error}).`);
        return;
      }

      if (!payload.code || exchangeInFlightRef.current) return;
      exchangeInFlightRef.current = true;
      setError(null);

      try {
        const token = await exchangeSpotifyPkceCode(payload.code, payload.state ?? null);
        setAccessToken(token);
        showToast('Connected to Spotify');
        await loadLibrary(token);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to exchange Spotify token.';
        setError(msg);
      } finally {
        exchangeInFlightRef.current = false;
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, showToast]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopiedUri(true);
      showToast('Copied Spotify Redirect URI');
      window.setTimeout(() => setCopiedUri(false), 1800);
    } catch {
      showToast('Unable to copy automatically', 'error');
    }
  };

  const handleConnect = async () => {
    const cleanId = clientId.trim();
    if (!cleanId) {
      setError('Enter your public Spotify App Client ID first.');
      return;
    }

    if (!hasEnvClientId) {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, cleanId);
    }

    setError(null);
    setConnecting(true);
    try {
      const authUrl = await buildSpotifyAuthorizeUrl(cleanId);
      const popup = window.open(
        authUrl,
        'spotify_oauth_popup',
        'width=560,height=720,scrollbars=yes'
      );
      if (!popup) {
        setConnecting(false);
        setError('Popup was blocked by your browser. Please allow popups for this site.');
      }
    } catch (err) {
      setConnecting(false);
      setError(err instanceof Error ? err.message : 'Could not start Spotify OAuth.');
    }
  };

  const handleDisconnect = () => {
    clearSpotifyToken();
    setAccessToken(null);
    setProfile(null);
    setPlaylists([]);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImportSelected = async () => {
    if (!accessToken || selectedIds.size === 0) return;
    setImporting(true);
    setError(null);

    try {
      const chosen = playlists.filter((p) => selectedIds.has(p.id));
      const imported: Playlist[] = [];

      for (const summary of chosen) {
        const tracks = await fetchSpotifyPlaylistTracks(
          accessToken,
          summary.id,
          summary.spotifyUrl
        );
        imported.push(
          mapSpotifySummaryToPlaylist(summary, tracks, importMood.trim() || 'Curated')
        );
      }

      onImportPlaylists(imported);
      showToast(`Imported ${imported.length} playlist${imported.length === 1 ? '' : 's'} with tracks`);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to import selected playlists.'
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotify-import-title"
    >
      <button
        type="button"
        aria-label="Close Spotify import modal"
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-2xl border border-zinc-800 bg-[#0D0D10] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span style={{ color: accentColor }} className="inline-flex items-center">
              <IconGlyph name="spotify" className="w-5 h-5" />
            </span>
            <h2 id="spotify-import-title" className="font-display text-lg font-semibold text-white">
              Import from Spotify (PKCE OAuth)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!accessToken ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#141418] space-y-3 text-xs text-zinc-300 leading-relaxed">
                <p className="font-medium text-white text-sm">
                  One-time free Spotify Developer App setup
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-400">
                  <li>
                    Open{' '}
                    <a
                      href="https://developer.spotify.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline underline-offset-2 inline-flex items-center gap-1"
                    >
                      <span>Spotify Developer Dashboard</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    and create an app (select <strong>Web API</strong>).
                  </li>
                  <li>Add this exact Redirect URI under your app settings and save:</li>
                </ol>

                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg border border-zinc-800 bg-[#08080A] text-[11px] font-mono-tabular text-zinc-200 truncate">
                    {redirectUri}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyRedirectUri}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white shrink-0 cursor-pointer"
                  >
                    {copiedUri ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUri ? 'Copied' : 'Copy URI'}</span>
                  </button>
                </div>
              </div>

              {!hasEnvClientId && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="spotify-client-id"
                    className="block text-xs font-medium text-zinc-300"
                  >
                    Spotify App Client ID (Public PKCE ID — no client secret needed)
                  </label>
                  <input
                    id="spotify-client-id"
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="e.g. 9f2a4c7d8e1b4c..."
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#08080A] text-sm font-mono-tabular text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                style={{ backgroundColor: accentColor, color: accentText }}
                className="w-full h-11 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting for Spotify Authorization...</span>
                  </>
                ) : (
                  <>
                    <IconGlyph name="spotify" className="w-4 h-4" />
                    <span>Connect Spotify Account</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Connected Profile Banner */}
              {profile && (
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#141418] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-700 shrink-0 bg-zinc-900">
                      <ResilientImage
                        src={profile.avatarUrl}
                        alt={profile.display_name}
                        fallbackTitle={profile.display_name}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {profile.display_name}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono-tabular truncate">
                        @{profile.id} · {profile.followersCount} followers
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSyncProfile(profile);
                        showToast('Synced Spotify profile info to page draft');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sync Profile to Page</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      title="Disconnect Spotify"
                      className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <Unplug className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              {/* Playlists Checklist */}
              {loadingLibrary ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-xs text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                  <span>Loading your Spotify playlists...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-medium text-zinc-300">
                        Select playlists to import ({selectedIds.size} selected)
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedIds(
                            selectedIds.size === playlists.length
                              ? new Set()
                              : new Set(playlists.map((p) => p.id))
                          )
                        }
                        className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 cursor-pointer"
                      >
                        {selectedIds.size === playlists.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="import-mood-input" className="text-xs text-zinc-400">
                        Mood tag:
                      </label>
                      <input
                        id="import-mood-input"
                        type="text"
                        value={importMood}
                        onChange={(e) => setImportMood(e.target.value)}
                        className="w-28 h-8 px-2.5 rounded-md border border-zinc-800 bg-[#08080A] text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => accessToken && loadLibrary(accessToken)}
                        title="Refresh Spotify playlists"
                        className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {playlists.map((pl) => {
                      const checked = selectedIds.has(pl.id);
                      return (
                        <label
                          key={pl.id}
                          className={`flex items-center gap-3.5 p-3 rounded-xl border transition-colors cursor-pointer ${
                            checked
                              ? 'border-zinc-500 bg-[#18181D]'
                              : 'border-zinc-800/80 bg-[#08080A] hover:border-zinc-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(pl.id)}
                            className="rounded border-zinc-700 shrink-0"
                          />
                          <div className="w-11 h-11 rounded-lg overflow-hidden border border-zinc-800 shrink-0 bg-zinc-900">
                            <ResilientImage
                              src={pl.coverUrl}
                              alt={pl.name}
                              fallbackTitle={pl.name}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                            <p className="text-xs text-zinc-400 truncate">
                              {pl.ownerName} · {pl.tracksTotal} tracks ·{' '}
                              {pl.isPublic ? 'Public' : 'Private'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {accessToken && (
          <div className="px-6 py-4 border-t border-zinc-800 bg-[#08080A] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] rounded-lg border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing || selectedIds.size === 0}
              onClick={handleImportSelected}
              style={{ backgroundColor: accentColor, color: accentText }}
              className="inline-flex items-center gap-2 px-5 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold hover:opacity-95 disabled:opacity-40 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Tracks...</span>
                </>
              ) : (
                <span>
                  Import {selectedIds.size} Playlist{selectedIds.size === 1 ? '' : 's'}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
