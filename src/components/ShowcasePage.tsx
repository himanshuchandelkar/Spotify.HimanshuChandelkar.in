import React, { useMemo, useState } from 'react';
import { ArrowUpRight, ListMusic, Search, X } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { ActionButton, Playlist } from '../types/site';
import { formatTotalDuration, getContrastTextColor, sanitizeExternalUrl } from '../utils/crypto';
import { IconGlyph } from './IconGlyph';
import { ResilientImage } from './ResilientImage';
import { ShowcaseHeader } from './ShowcaseHeader';
import { TracklistDrawer } from './TracklistDrawer';

export const ShowcasePage: React.FC = () => {
  const { config, showToast } = useSite();
  const { brand, hero, curator, theme, playlists } = config;

  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  const accent = theme.accentColor || '#1DB954';
  const accentText = getContrastTextColor(accent);

  const visiblePlaylists = useMemo(
    () => playlists.filter((p) => p.visible),
    [playlists]
  );

  const featuredPlaylist = useMemo(
    () => visiblePlaylists.find((p) => p.featured) || visiblePlaylists[0] || null,
    [visiblePlaylists]
  );

  const moods = useMemo(() => {
    const unique = Array.from(new Set(visiblePlaylists.map((p) => p.mood).filter(Boolean)));
    return ['All', ...unique];
  }, [visiblePlaylists]);

  const filteredPlaylists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return visiblePlaylists.filter((playlist) => {
      const moodMatch = selectedMood === 'All' || playlist.mood === selectedMood;
      if (!moodMatch) return false;
      if (!query) return true;
      const inMeta =
        playlist.title.toLowerCase().includes(query) ||
        playlist.description.toLowerCase().includes(query) ||
        playlist.mood.toLowerCase().includes(query);
      const inTracks = playlist.tracks.some(
        (t) =>
          t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query)
      );
      return inMeta || inTracks;
    });
  }, [visiblePlaylists, selectedMood, searchQuery]);

  const activePlaylist = useMemo(
    () => visiblePlaylists.find((p) => p.id === activePlaylistId) || null,
    [visiblePlaylists, activePlaylistId]
  );

  const totalTracksCount = useMemo(
    () => visiblePlaylists.reduce((sum, p) => sum + p.tracks.length, 0),
    [visiblePlaylists]
  );

  const totalRuntime = useMemo(() => {
    const allDurations = visiblePlaylists.flatMap((p) => p.tracks.map((t) => t.duration));
    return formatTotalDuration(allDurations) || '0m';
  }, [visiblePlaylists]);

  const handleOpenFeatured = () => {
    if (featuredPlaylist) {
      setActivePlaylistId(featuredPlaylist.id);
    } else {
      const el = document.getElementById('playlists');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleActionButton = async (btn: ActionButton) => {
    if (btn.actionType === 'featured_drawer') {
      handleOpenFeatured();
      return;
    }
    if (btn.actionType === 'scroll_playlists') {
      document.getElementById('playlists')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (btn.actionType === 'copy_url') {
      const linkToCopy = btn.url && btn.url !== '#' ? btn.url : window.location.origin;
      try {
        await navigator.clipboard.writeText(linkToCopy);
        showToast(`Copied ${linkToCopy}`);
      } catch {
        showToast('Clipboard permission unavailable', 'error');
      }
      return;
    }
  };

  const renderClickableButton = (btn: ActionButton) => {
    if (!btn.visible) return null;

    const baseClasses =
      'inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

    const styleProps =
      btn.variant === 'accent'
        ? { backgroundColor: accent, color: accentText }
        : undefined;

    const variantClasses =
      btn.variant === 'accent'
        ? 'hover:opacity-95 active:scale-[0.98]'
        : btn.variant === 'outline'
        ? 'border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-900 hover:border-zinc-500'
        : 'bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800';

    if (btn.actionType === 'link') {
      return (
        <a
          key={btn.id}
          href={sanitizeExternalUrl(btn.url)}
          target="_blank"
          rel="noopener noreferrer"
          style={styleProps}
          className={`${baseClasses} ${variantClasses}`}
        >
          <IconGlyph name={btn.icon} className="w-4 h-4 shrink-0" />
          <span>{btn.label}</span>
        </a>
      );
    }

    return (
      <button
        key={btn.id}
        type="button"
        onClick={() => handleActionButton(btn)}
        style={styleProps}
        className={`${baseClasses} ${variantClasses}`}
      >
        <IconGlyph name={btn.icon} className="w-4 h-4 shrink-0" />
        <span>{btn.label}</span>
      </button>
    );
  };

  return (
    <div id="top" className="min-h-screen bg-[#050505] text-[#F4F4F5] flex flex-col">
      <ShowcaseHeader onOpenFeatured={handleOpenFeatured} />

      <main className="flex-1">
        {/* Top Real-Time Search Bar */}
        <section
          aria-label="Search playlists"
          className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 pt-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    document
                      .getElementById('playlists')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                placeholder="Search playlists by title or genre..."
                aria-label="Search playlists by title or genre"
                className="w-full h-12 pl-11 pr-10 rounded-xl border border-zinc-800/90 bg-[#0D0D10] text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 px-1">
                <span className="text-xs font-mono-tabular text-zinc-400 whitespace-nowrap">
                  {filteredPlaylists.length} of {visiblePlaylists.length} matching
                </span>
                <a
                  href="#playlists"
                  style={{ color: accent }}
                  className="text-xs font-semibold hover:underline underline-offset-4 whitespace-nowrap"
                >
                  Jump to results
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Split-Screen Opening: Spotify Profile + Featured Playlist Side Card */}
        <section className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 pt-6 pb-12 lg:pt-8 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Left Column: Spotify Profile Card */}
            <div className="lg:col-span-7 rounded-2xl border border-zinc-800/90 bg-[#0D0D10] p-6 sm:p-8 flex flex-col justify-between gap-8">
              {/* Profile Header Row */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-zinc-700/80 shrink-0 bg-zinc-900">
                    <ResilientImage
                      src={brand.curatorAvatarUrl}
                      alt={brand.curatorName}
                      fallbackTitle={brand.curatorName}
                    />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400">
                      <span style={{ color: accent }} className="inline-flex items-center">
                        <IconGlyph name="spotify" className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-zinc-300">{brand.profileLabel || 'Spotify Profile'}</span>
                      {brand.spotifyHandle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-zinc-300">
                            {brand.spotifyHandle}
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white truncate">
                      {brand.curatorName}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono-tabular">
                      <span>{visiblePlaylists.length} Public Playlists</span>
                      {brand.followersCount && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{brand.followersCount} Followers</span>
                        </>
                      )}
                      {brand.followingCount && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{brand.followingCount} Following</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editorial Display Headline & Bio */}
                <div className="pt-5 border-t border-zinc-800/80 space-y-3">
                  <p className="text-xs font-medium text-zinc-400">{hero.kicker}</p>
                  <h1 className="font-display text-[clamp(1.85rem,3.4vw,3rem)] font-semibold leading-[1.08] tracking-tight text-white text-balance">
                    {hero.headlineLead}{' '}
                    <span className="font-editorial italic font-medium text-zinc-200">
                      {hero.headlineItalic}
                    </span>
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-[60ch]">
                    {hero.subheadline}
                  </p>
                </div>
              </div>

              {/* Clickable Profile & Hub Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {brand.spotifyProfileUrl && (
                  <a
                    href={sanitizeExternalUrl(brand.spotifyProfileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: accent, color: accentText }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold transition-all duration-150 hover:opacity-95 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <IconGlyph name="spotify" className="w-4 h-4 shrink-0" />
                    <span>View Spotify Profile</span>
                  </a>
                )}
                {hero.actionButtons.map(renderClickableButton)}
              </div>
            </div>

            {/* Right Column: Featured Playlist Side Card */}
            <div className="lg:col-span-5 flex">
              {featuredPlaylist ? (
                <aside className="w-full rounded-2xl border border-zinc-800/90 bg-[#111113] overflow-hidden flex flex-col justify-between">
                  {/* Featured Cover Banner */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setActivePlaylistId(featuredPlaylist.id)}
                      className="relative w-full aspect-[16/9] overflow-hidden bg-zinc-950 text-left group cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ResilientImage
                        src={featuredPlaylist.coverUrl}
                        alt={`${featuredPlaylist.title} featured cover`}
                        fallbackTitle={featuredPlaylist.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-black/40 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <span className="font-medium text-white">Featured Playlist</span>
                          <span aria-hidden="true">·</span>
                          <span>{featuredPlaylist.mood}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {featuredPlaylist.tracks.length} tracks
                          </span>
                        </div>
                        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white line-clamp-1">
                          {featuredPlaylist.title}
                        </h2>
                      </div>
                    </button>

                    {/* Description + Quick Track Preview */}
                    <div className="px-5 pt-2 pb-4 space-y-4">
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-2">
                        {featuredPlaylist.description}
                      </p>

                      {featuredPlaylist.tracks.length > 0 && (
                        <div className="border-t border-zinc-800/80 pt-3 space-y-1">
                          <p className="text-xs font-medium text-zinc-500 pb-1">
                            Tracklist Preview
                          </p>
                          {featuredPlaylist.tracks.slice(0, 3).map((tr, idx) => (
                            <button
                              key={tr.id}
                              type="button"
                              onClick={() => setActivePlaylistId(featuredPlaylist.id)}
                              className="w-full flex items-center justify-between gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-zinc-900/80 transition-colors text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-[11px] font-mono-tabular text-zinc-500 w-4 shrink-0">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-zinc-200 truncate">
                                    {tr.title}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 truncate">
                                    {tr.artist}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono-tabular text-zinc-500 shrink-0">
                                {tr.duration}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clickable Featured Playlist Actions */}
                  <div className="px-5 pb-5 pt-2 flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActivePlaylistId(featuredPlaylist.id)}
                      style={{ backgroundColor: accent, color: accentText }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg text-xs sm:text-sm font-semibold hover:opacity-95 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <ListMusic className="w-4 h-4 shrink-0" />
                      <span>Open Tracklist</span>
                    </button>

                    <a
                      href={sanitizeExternalUrl(featuredPlaylist.spotifyUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-xs sm:text-sm font-medium text-zinc-200 hover:text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                    >
                      <IconGlyph name="spotify" className="w-4 h-4 shrink-0" />
                      <span>Play</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                    </a>
                  </div>
                </aside>
              ) : (
                <div className="relative w-full min-h-[340px] lg:h-full rounded-2xl overflow-hidden border border-zinc-800 bg-[#111113]">
                  <ResilientImage
                    src={hero.heroImageUrl}
                    alt={hero.heroImageCaption}
                    fallbackTitle={brand.domainName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="text-xs text-zinc-300">{hero.heroImageCaption}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full-Width Collection Summary Strip */}
          {theme.showStats && (
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 border border-zinc-800/90 rounded-2xl bg-[#0B0B0E] divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/90">
              <div className="p-5 sm:p-6">
                <p className="text-xs text-zinc-400">Published Editions</p>
                <p className="mt-1 font-display text-2xl font-semibold text-white font-mono-tabular">
                  {String(visiblePlaylists.length).padStart(2, '0')}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs text-zinc-400">Sequenced Tracks</p>
                <p className="mt-1 font-display text-2xl font-semibold text-white font-mono-tabular">
                  {totalTracksCount}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs text-zinc-400">Total Runtime</p>
                <p className="mt-1 font-display text-2xl font-semibold text-white font-mono-tabular">
                  {totalRuntime}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs text-zinc-400">Mood Chapters</p>
                <p className="mt-1 font-display text-2xl font-semibold text-white font-mono-tabular">
                  {Math.max(0, moods.length - 1)}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Subtle Editorial Marquee Divider */}
        {theme.showMarquee && theme.marqueeText.trim() && (
          <div className="border-y border-zinc-800/80 bg-[#0A0A0C] py-3.5 overflow-hidden select-none">
            <div className="animate-editorial-marquee text-xs sm:text-sm text-zinc-400 font-editorial italic tracking-wide">
              <span className="px-6">{theme.marqueeText}</span>
              <span className="px-6" aria-hidden="true">·</span>
              <span className="px-6">{theme.marqueeText}</span>
              <span className="px-6" aria-hidden="true">·</span>
              <span className="px-6">{theme.marqueeText}</span>
              <span className="px-6" aria-hidden="true">·</span>
              <span className="px-6">{theme.marqueeText}</span>
              <span className="px-6" aria-hidden="true">·</span>
            </div>
          </div>
        )}

        {/* Curated Playlists Showcase */}
        <section
          id="playlists"
          className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 py-14 lg:py-20 space-y-8"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                {theme.playlistsHeading}
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                {theme.playlistsSubheading}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono-tabular shrink-0">
              <span>
                Showing {filteredPlaylists.length} of {visiblePlaylists.length}
              </span>
              {(searchQuery.trim() || selectedMood !== 'All') && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedMood('All');
                    }}
                    className="text-zinc-200 hover:text-white underline underline-offset-4 cursor-pointer"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Interactive Mood Filter Tabs */}
          {moods.length > 1 && (
            <div
              role="tablist"
              aria-label="Filter playlists by mood"
              className="flex items-center gap-1.5 overflow-x-auto pb-1"
            >
              {moods.map((mood) => {
                const isActive = selectedMood === mood;
                return (
                  <button
                    key={mood}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setSelectedMood(mood)}
                    style={isActive ? { backgroundColor: accent, color: accentText } : undefined}
                    className={`px-4 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      isActive
                        ? 'font-semibold'
                        : 'bg-[#111113] border border-zinc-800/90 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                    }`}
                  >
                    {mood}
                  </button>
                );
              })}
            </div>
          )}

          {/* Playlist Bento / Uniform Grid */}
          {filteredPlaylists.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-12 text-center space-y-4">
              <p className="font-display text-lg font-medium text-zinc-200">
                No playlists match this filter
              </p>
              <p className="text-sm text-zinc-400">
                Try clearing your search term or switching back to all moods.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedMood('All');
                  setSearchQuery('');
                }}
                style={{ backgroundColor: accent, color: accentText }}
                className="inline-flex items-center px-4 py-2 min-h-[40px] rounded-lg text-sm font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlaylists.map((playlist: Playlist, index: number) => {
                const isBentoLead =
                  theme.layoutMode === 'bento' &&
                  (playlist.featured || index === 0) &&
                  filteredPlaylists.length >= 2;
                const runtime = formatTotalDuration(playlist.tracks.map((t) => t.duration));

                return (
                  <article
                    key={playlist.id}
                    className={`group rounded-2xl border border-zinc-800/90 bg-[#111113] overflow-hidden flex flex-col transition-colors duration-200 hover:border-zinc-700 ${
                      isBentoLead ? 'md:col-span-2 lg:col-span-2' : ''
                    }`}
                  >
                    {/* Cover Artwork Frame */}
                    <button
                      type="button"
                      onClick={() => setActivePlaylistId(playlist.id)}
                      className={`relative w-full overflow-hidden bg-zinc-950 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        isBentoLead ? 'aspect-[16/9]' : 'aspect-[4/3]'
                      }`}
                    >
                      <ResilientImage
                        src={playlist.coverUrl}
                        alt={`${playlist.title} cover`}
                        fallbackTitle={playlist.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between gap-3 text-xs text-zinc-300">
                        <div className="flex items-center gap-2 truncate">
                          <span>{playlist.mood}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{playlist.year}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">
                            {playlist.tracks.length} tracks
                          </span>
                          {runtime !== '0m' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">{runtime}</span>
                            </>
                          )}
                        </div>
                        {playlist.featured && (
                          <span className="font-medium text-white shrink-0">Featured</span>
                        )}
                      </div>
                    </button>

                    {/* Card Details & Clickable Buttons */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-5">
                      <div className="space-y-2">
                        <h3 className="font-display text-xl font-semibold tracking-tight text-white text-balance">
                          <button
                            type="button"
                            onClick={() => setActivePlaylistId(playlist.id)}
                            className="text-left hover:underline underline-offset-4 cursor-pointer"
                          >
                            {playlist.title}
                          </button>
                        </h3>
                        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
                          {playlist.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setActivePlaylistId(playlist.id)}
                          style={{ backgroundColor: accent, color: accentText }}
                          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-opacity hover:opacity-95 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <ListMusic className="w-4 h-4" />
                          <span>View Tracklist</span>
                        </button>

                        <a
                          href={sanitizeExternalUrl(playlist.spotifyUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                        >
                          <IconGlyph name="spotify" className="w-3.5 h-3.5" />
                          <span>Spotify</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                        </a>

                        {playlist.customButtons.map((cbtn) => (
                          <a
                            key={cbtn.id}
                            href={sanitizeExternalUrl(cbtn.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
                          >
                            <IconGlyph name={cbtn.icon} className="w-3.5 h-3.5" />
                            <span>{cbtn.label}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Curator Monograph & Clickable Links */}
        {theme.showCuratorSection && (
          <section
            id="curator"
            className="border-t border-zinc-800/80 bg-[#08080A]"
          >
            <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-4">
                <div className="aspect-square max-w-[320px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  <ResilientImage
                    src={brand.curatorAvatarUrl}
                    alt={brand.curatorName}
                    fallbackTitle={brand.curatorName}
                  />
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-zinc-400">{curator.heading}</p>
                  <blockquote className="font-editorial italic text-2xl sm:text-3xl text-zinc-100 leading-snug text-balance">
                    {curator.quote}
                  </blockquote>
                  <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-[65ch]">
                    {curator.bio}
                  </p>
                </div>

                <div id="connect" className="pt-4 border-t border-zinc-800/80 space-y-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-white">
                      {curator.connectHeading}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400">{curator.connectSubtext}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {curator.socialButtons.map(renderClickableButton)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Quiet Editorial Footer (No admin link exposed) */}
      <footer className="border-t border-zinc-800/80 bg-[#050505]">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500">
          <p>{brand.footerCopyright}</p>
          <p>{brand.footerSubline}</p>
        </div>
      </footer>

      {/* Interactive Tracklist Slide-Over Drawer */}
      <TracklistDrawer
        playlist={activePlaylist}
        playlists={visiblePlaylists}
        onClose={() => setActivePlaylistId(null)}
        onSelectPlaylist={(id) => setActivePlaylistId(id)}
      />
    </div>
  );
};
