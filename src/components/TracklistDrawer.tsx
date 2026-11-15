import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, X } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { Playlist } from '../types/site';
import { formatTotalDuration, getContrastTextColor, sanitizeExternalUrl } from '../utils/crypto';
import { IconGlyph } from './IconGlyph';
import { PlaylistMoodRadar } from './PlaylistMoodRadar';
import { ResilientImage } from './ResilientImage';

interface TracklistDrawerProps {
  playlist: Playlist | null;
  playlists: Playlist[];
  onClose: () => void;
  onSelectPlaylist: (id: string) => void;
}

export const TracklistDrawer: React.FC<TracklistDrawerProps> = ({
  playlist,
  playlists,
  onClose,
  onSelectPlaylist,
}) => {
  const { config, showToast } = useSite();
  const [copied, setCopied] = React.useState(false);
  const [hoveredTrackId, setHoveredTrackId] = React.useState<string | null>(null);

  const accent = config.theme.accentColor || '#1DB954';
  const accentText = getContrastTextColor(accent);

  useEffect(() => {
    setHoveredTrackId(null);
  }, [playlist?.id]);

  useEffect(() => {
    if (!playlist) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [playlist, onClose]);

  if (!playlist) return null;

  const currentIndex = playlists.findIndex((p) => p.id === playlist.id);
  const prevPlaylist = currentIndex > 0 ? playlists[currentIndex - 1] : null;
  const nextPlaylist =
    currentIndex >= 0 && currentIndex < playlists.length - 1 ? playlists[currentIndex + 1] : null;

  const totalRuntime = formatTotalDuration(playlist.tracks.map((t) => t.duration));
  const hoveredTrack =
    playlist.tracks.find((t) => t.id === hoveredTrackId) || null;

  const handleCopySpotify = async () => {
    const targetUrl = sanitizeExternalUrl(playlist.spotifyUrl);
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      showToast(`Copied "${playlist.title}" Spotify link`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Unable to copy link in this browser context', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-playlist-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close tracklist drawer"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity cursor-pointer"
      />

      {/* Slide-over Panel */}
      <aside className="relative z-10 w-full max-w-[540px] h-full bg-[#0D0D10] border-l border-zinc-800 flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium truncate">
            <span>{playlist.mood}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{playlist.year}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{playlist.tracks.length} tracks</span>
            {totalRuntime !== '0m' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{totalRuntime}</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-10 h-10 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Cover + Title Block */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-zinc-800 shrink-0 bg-zinc-900">
              <ResilientImage
                src={playlist.coverUrl}
                alt={`${playlist.title} cover artwork`}
                fallbackTitle={playlist.title}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {playlist.featured && (
                <p className="text-xs font-medium text-zinc-400">Featured Collection</p>
              )}
              <h2
                id="drawer-playlist-title"
                className="font-display text-2xl font-semibold tracking-tight text-white text-balance"
              >
                {playlist.title}
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">{playlist.description}</p>
            </div>
          </div>

          {/* Clickable Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={sanitizeExternalUrl(playlist.spotifyUrl)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: accent, color: accentText }}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold transition-transform duration-150 hover:opacity-95 active:scale-[0.98] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <IconGlyph name="spotify" className="w-4 h-4" />
              <span>Open in Spotify</span>
            </a>

            <button
              type="button"
              onClick={handleCopySpotify}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
            </button>

            {playlist.customButtons.map((btn) => (
              <a
                key={btn.id}
                href={sanitizeExternalUrl(btn.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-300 hover:text-white text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <IconGlyph name={btn.icon} className="w-4 h-4" />
                <span>{btn.label}</span>
              </a>
            ))}
          </div>

          {/* Curator Liner Note */}
          {playlist.curatorNote && (
            <div className="p-4 rounded-xl bg-[#141418] border border-zinc-800/80 space-y-1.5">
              <p className="text-xs font-medium text-zinc-400">Curator Liner Notes</p>
              <p className="text-sm text-zinc-300 leading-relaxed font-editorial italic">
                {playlist.curatorNote}
              </p>
            </div>
          )}

          {/* D3 Playlist Mood Radar Chart */}
          <PlaylistMoodRadar
            tracks={playlist.tracks}
            playlistMood={playlist.mood}
            accentColor={accent}
            hoveredTrack={hoveredTrack}
          />

          {/* Tracklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <h3 className="font-display text-sm font-semibold text-zinc-200">Tracklist</h3>
              <span className="text-xs text-zinc-500 font-mono-tabular">
                {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>

            {playlist.tracks.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                No tracks added to this playlist yet.
              </p>
            ) : (
              <ol className="divide-y divide-zinc-800/60">
                {playlist.tracks.map((track, idx) => (
                  <li
                    key={track.id}
                    onMouseEnter={() => setHoveredTrackId(track.id)}
                    onMouseLeave={() => setHoveredTrackId(null)}
                    className="group py-3 flex items-center justify-between gap-4 hover:bg-zinc-900/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-6 text-right text-xs font-mono-tabular text-zinc-500 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{track.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono-tabular text-zinc-500">
                        {track.duration || '—'}
                      </span>
                      <a
                        href={sanitizeExternalUrl(track.spotifyTrackUrl || playlist.spotifyUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${track.title} on Spotify`}
                        className="w-8 h-8 rounded-md border border-transparent group-hover:border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Drawer Footer Navigation */}
        {(prevPlaylist || nextPlaylist) && (
          <div className="px-6 py-3.5 border-t border-zinc-800/80 bg-[#0A0A0D] flex items-center justify-between gap-4 shrink-0">
            <button
              type="button"
              disabled={!prevPlaylist}
              onClick={() => prevPlaylist && onSelectPlaylist(prevPlaylist.id)}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none py-2 cursor-pointer truncate max-w-[45%]"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{prevPlaylist ? prevPlaylist.title : 'Start'}</span>
            </button>

            <button
              type="button"
              disabled={!nextPlaylist}
              onClick={() => nextPlaylist && onSelectPlaylist(nextPlaylist.id)}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none py-2 cursor-pointer truncate max-w-[45%]"
            >
              <span className="truncate">{nextPlaylist ? nextPlaylist.title : 'End'}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
