import { PRESET_ARTWORK } from '../data/defaultSiteConfig';
import { Playlist, Track } from '../types/site';
import { createId, sha256Hex } from './crypto';

const PKCE_STORAGE_KEY = 'smd_spotify_pkce_state_v1';
const SPOTIFY_TOKEN_KEY = 'smd_spotify_token_v1';

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  followersCount: string;
  avatarUrl: string;
  profileUrl: string;
}

export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  spotifyUrl: string;
  tracksTotal: number;
  ownerName: string;
  isPublic: boolean;
}

interface StoredPkceState {
  verifier: string;
  state: string;
  clientId: string;
  redirectUri: string;
}

interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

function randomUrlSafeString(length = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i++) {
      values[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(values)
    .map((v) => charset[v % charset.length])
    .join('');
}

function hexToBase64Url(hex: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digestHex = await sha256Hex(verifier);
  return hexToBase64Url(digestHex);
}

export function getSpotifyRedirectUri(): string {
  if (typeof window === 'undefined') return '/spotify-callback.html';
  return `${window.location.origin}/spotify-callback.html`;
}

export function getSavedSpotifyToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SPOTIFY_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (!parsed.accessToken || Date.now() >= parsed.expiresAt) {
      window.sessionStorage.removeItem(SPOTIFY_TOKEN_KEY);
      return null;
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
}

export function clearSpotifyToken(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SPOTIFY_TOKEN_KEY);
}

export async function buildSpotifyAuthorizeUrl(clientId: string): Promise<string> {
  const cleanClientId = clientId.trim();
  const verifier = randomUrlSafeString(64);
  const state = randomUrlSafeString(24);
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getSpotifyRedirectUri();

  const pkcePayload: StoredPkceState = {
    verifier,
    state,
    clientId: cleanClientId,
    redirectUri,
  };
  window.localStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pkcePayload));

  const params = new URLSearchParams({
    client_id: cleanClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: 'playlist-read-private playlist-read-collaborative user-read-private',
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeSpotifyPkceCode(
  code: string,
  returnedState: string | null
): Promise<string> {
  const raw = window.localStorage.getItem(PKCE_STORAGE_KEY);
  if (!raw) {
    throw new Error('Missing PKCE session state. Please try connecting again.');
  }
  const stored = JSON.parse(raw) as StoredPkceState;
  window.localStorage.removeItem(PKCE_STORAGE_KEY);

  if (!returnedState || returnedState !== stored.state) {
    throw new Error('OAuth state mismatch. Please try connecting again.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: stored.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: stored.redirectUri,
      code_verifier: stored.verifier,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'Spotify token exchange failed.'
    );
  }

  const expiresInMs = (Number(data.expires_in) || 3600) * 1000 - 30_000;
  const tokenRecord: StoredToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresInMs,
  };
  window.sessionStorage.setItem(SPOTIFY_TOKEN_KEY, JSON.stringify(tokenRecord));
  return data.access_token as string;
}

function cleanSpotifyDescription(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function formatDurationMs(ms: number | undefined): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) return '3:30';
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export async function fetchSpotifyProfile(accessToken: string): Promise<SpotifyUserProfile> {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Could not load Spotify profile. Please reconnect.');
  }
  const data = await res.json();
  const followers = data.followers?.total;
  return {
    id: data.id || 'spotify-user',
    display_name: data.display_name || data.id || 'Spotify Curator',
    followersCount:
      typeof followers === 'number' ? followers.toLocaleString() : '0',
    avatarUrl: data.images?.[0]?.url || '',
    profileUrl: data.external_urls?.spotify || 'https://open.spotify.com/',
  };
}

export async function fetchSpotifyPlaylists(
  accessToken: string
): Promise<SpotifyPlaylistSummary[]> {
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error('Could not fetch playlists from Spotify.');
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .filter((pl: Record<string, unknown>) => Boolean(pl && pl.id && pl.name))
    .map((pl: Record<string, unknown>) => {
      const images = Array.isArray(pl.images) ? (pl.images as { url?: string }[]) : [];
      const tracksObj = (pl.tracks || pl.items) as { total?: number } | undefined;
      const extUrls = pl.external_urls as { spotify?: string } | undefined;
      const owner = pl.owner as { display_name?: string; id?: string } | undefined;

      return {
        id: String(pl.id),
        name: String(pl.name),
        description: cleanSpotifyDescription(pl.description as string | undefined),
        coverUrl: images[0]?.url || PRESET_ARTWORK[0].url,
        spotifyUrl: extUrls?.spotify || `https://open.spotify.com/playlist/${pl.id}`,
        tracksTotal: typeof tracksObj?.total === 'number' ? tracksObj.total : 0,
        ownerName: owner?.display_name || owner?.id || 'Spotify',
        isPublic: pl.public !== false,
      };
    });
}

export async function fetchSpotifyPlaylistTracks(
  accessToken: string,
  playlistId: string,
  fallbackPlaylistUrl: string
): Promise<Track[]> {
  const endpoints = [
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50`,
    `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=50`,
  ];

  let payload: Record<string, unknown> | null = null;
  for (const url of endpoints) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      payload = await res.json();
      break;
    }
  }

  if (!payload || !Array.isArray(payload.items)) {
    return [];
  }

  const tracks: Track[] = [];
  for (const row of payload.items as Record<string, unknown>[]) {
    const media = (row.track || row.item) as Record<string, unknown> | null | undefined;
    if (!media || !media.name) continue;
    const artists = Array.isArray(media.artists)
      ? (media.artists as { name?: string }[])
          .map((a) => a.name)
          .filter(Boolean)
          .join(', ')
      : '';
    const ext = media.external_urls as { spotify?: string } | undefined;
    tracks.push({
      id: createId('tr'),
      title: String(media.name),
      artist: artists || 'Unknown Artist',
      duration: formatDurationMs(media.duration_ms as number | undefined),
      spotifyTrackUrl: ext?.spotify || fallbackPlaylistUrl,
    });
  }

  return tracks;
}

export function mapSpotifySummaryToPlaylist(
  summary: SpotifyPlaylistSummary,
  tracks: Track[],
  moodLabel = 'Spotify Import'
): Playlist {
  return {
    id: `pl_sp_${summary.id}`,
    title: summary.name,
    mood: moodLabel,
    year: String(new Date().getFullYear()),
    description:
      summary.description ||
      `Imported from ${summary.ownerName}'s Spotify library (${tracks.length} tracks).`,
    curatorNote: `Synced directly from Spotify (${summary.isPublic ? 'Public' : 'Private'} playlist).`,
    coverUrl: summary.coverUrl,
    spotifyUrl: summary.spotifyUrl,
    featured: false,
    visible: true,
    customButtons: [],
    tracks,
  };
}
