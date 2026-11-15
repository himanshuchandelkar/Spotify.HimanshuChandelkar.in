import React from 'react';
import { useSite } from '../context/SiteContext';
import { getContrastTextColor, sanitizeExternalUrl } from '../utils/crypto';
import { IconGlyph } from './IconGlyph';

interface ShowcaseHeaderProps {
  onOpenFeatured: () => void;
}

export const ShowcaseHeader: React.FC<ShowcaseHeaderProps> = ({ onOpenFeatured }) => {
  const { config } = useSite();
  const { brand, theme } = config;
  const accent = theme.accentColor || '#1DB954';
  const accentText = getContrastTextColor(accent);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#050505]/90 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          className="font-display text-base sm:text-lg font-semibold tracking-tight text-zinc-100 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
        >
          {brand.domainName}
        </a>

        {/* Zone 2: 4 concise single-line section links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400"
        >
          <button
            type="button"
            onClick={onOpenFeatured}
            className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
          >
            Featured
          </button>
          <a
            href="#playlists"
            className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
          >
            Playlists
          </a>
          {theme.showCuratorSection && (
            <>
              <a
                href="#curator"
                className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
              >
                Curator
              </a>
              <a
                href="#connect"
                className="hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-sm"
              >
                Connect
              </a>
            </>
          )}
        </nav>

        {/* Zone 3: 1 primary CTA button */}
        <div className="shrink-0">
          <a
            href={sanitizeExternalUrl(brand.headerCtaUrl)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: accent, color: accentText }}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-transform duration-150 hover:opacity-95 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <IconGlyph name="spotify" className="w-4 h-4 shrink-0" />
            <span>{brand.headerCtaLabel || 'Open Spotify'}</span>
          </a>
        </div>
      </div>
    </header>
  );
};
