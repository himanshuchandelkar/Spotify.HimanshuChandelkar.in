import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { PRESET_ARTWORK } from '../data/defaultSiteConfig';
import {
  ActionButton,
  ButtonActionType,
  ButtonIconName,
  ButtonVariant,
  Playlist,
  SiteConfig,
} from '../types/site';
import { resolveTrackAudioFeatures } from '../utils/audioFeatures';
import { createId, getContrastTextColor } from '../utils/crypto';
import { SpotifyUserProfile } from '../utils/spotifyPkce';
import { IconGlyph } from './IconGlyph';
import { ResilientImage } from './ResilientImage';
import { SpotifyImportModal } from './SpotifyImportModal';

type AdminTab = 'playlists' | 'copy' | 'buttons' | 'theme';

const ICON_OPTIONS: { value: ButtonIconName; label: string }[] = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'disc', label: 'Vinyl Disc' },
  { value: 'radio', label: 'Radio' },
  { value: 'music', label: 'Music Note' },
  { value: 'heart', label: 'Heart' },
  { value: 'share', label: 'Share' },
  { value: 'globe', label: 'Globe' },
  { value: 'external', label: 'External Link' },
];

const ACCENT_SWATCHES = [
  { name: 'Spotify Emerald', hex: '#1DB954' },
  { name: 'Warm Amber', hex: '#F59E0B' },
  { name: 'Electric Cobalt', hex: '#3B82F6' },
  { name: 'Cinnabar Red', hex: '#E11D48' },
  { name: 'Crisp Chalk', hex: '#F4F4F5' },
];

export const AdminStudioPage: React.FC = () => {
  const {
    config,
    isAuthenticated,
    adminUserId,
    navigate,
    updateConfig,
    resetConfig,
    exportConfigJson,
    importConfigJson,
    logout,
    updateCredentials,
    showToast,
  } = useSite();

  const [activeTab, setActiveTab] = useState<AdminTab>('playlists');
  const [draft, setDraft] = useState<SiteConfig>(() => structuredClone(config));
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    () => config.playlists[0]?.id || ''
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [spotifyImportOpen, setSpotifyImportOpen] = useState(false);

  // Auth update form state
  const [currentPasswd, setCurrentPasswd] = useState('');
  const [newUserId, setNewUserId] = useState(adminUserId);
  const [newPasswd, setNewPasswd] = useState('');
  const [authStatus, setAuthStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/adminlogin');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setDraft(structuredClone(config));
    if (!config.playlists.some((p) => p.id === selectedPlaylistId)) {
      setSelectedPlaylistId(config.playlists[0]?.id || '');
    }
  }, [config]);

  if (!isAuthenticated) return null;

  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);
  const accent = draft.theme.accentColor || '#1DB954';
  const accentText = getContrastTextColor(accent);

  const selectedPlaylist =
    draft.playlists.find((p) => p.id === selectedPlaylistId) || draft.playlists[0] || null;

  const handleSave = () => {
    updateConfig(draft);
    showToast('Saved changes to live showcase');
  };

  const updateSelectedPlaylist = (updater: (pl: Playlist) => Playlist) => {
    if (!selectedPlaylist) return;
    setDraft((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) => (p.id === selectedPlaylist.id ? updater(p) : p)),
    }));
  };

  const handleAddPlaylist = () => {
    const id = createId('pl');
    const newPl: Playlist = {
      id,
      title: 'Untitled Collection',
      mood: 'Late Night',
      year: String(new Date().getFullYear()),
      description: 'Describe the sound, texture, and setting for this playlist.',
      curatorNote: 'Add personal liner notes or sequencing tips for listeners.',
      coverUrl: PRESET_ARTWORK[0].url,
      spotifyUrl: 'https://open.spotify.com/',
      featured: false,
      visible: true,
      customButtons: [],
      tracks: [
        {
          id: createId('tr'),
          title: 'Opening Track',
          artist: 'Artist Name',
          duration: '3:45',
          spotifyTrackUrl: 'https://open.spotify.com/',
        },
      ],
    };
    setDraft((prev) => ({ ...prev, playlists: [newPl, ...prev.playlists] }));
    setSelectedPlaylistId(id);
    showToast('Added new playlist draft', 'info');
  };

  const handleDuplicatePlaylist = (pl: Playlist) => {
    const id = createId('pl');
    const copy: Playlist = {
      ...structuredClone(pl),
      id,
      title: `${pl.title} (Copy)`,
      featured: false,
    };
    setDraft((prev) => ({ ...prev, playlists: [copy, ...prev.playlists] }));
    setSelectedPlaylistId(id);
  };

  const handleDeletePlaylist = (id: string) => {
    setDraft((prev) => {
      const next = prev.playlists.filter((p) => p.id !== id);
      if (selectedPlaylistId === id) {
        setSelectedPlaylistId(next[0]?.id || '');
      }
      return { ...prev, playlists: next };
    });
  };

  const handleMovePlaylist = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    setDraft((prev) => {
      if (target < 0 || target >= prev.playlists.length) return prev;
      const copy = [...prev.playlists];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return { ...prev, playlists: copy };
    });
  };

  const handleSetFeatured = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      playlists: prev.playlists.map((p) => ({
        ...p,
        featured: p.id === id,
      })),
    }));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importConfigJson(String(reader.result || ''));
      if (!res.ok) {
        showToast(res.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAuthUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthStatus(null);
    const res = await updateCredentials(currentPasswd, newUserId, newPasswd);
    if (!res.ok) {
      setAuthStatus({ ok: false, msg: res.error || 'Could not update credentials.' });
      return;
    }
    setCurrentPasswd('');
    setNewPasswd('');
    setAuthStatus({ ok: true, msg: 'User ID and Password updated.' });
  };

  const handleSyncSpotifyProfile = (profile: SpotifyUserProfile) => {
    setDraft((prev) => ({
      ...prev,
      brand: {
        ...prev.brand,
        curatorName: profile.display_name || prev.brand.curatorName,
        spotifyHandle: `@${profile.id}`,
        followersCount: profile.followersCount || prev.brand.followersCount,
        spotifyProfileUrl: profile.profileUrl || prev.brand.spotifyProfileUrl,
        headerCtaUrl: profile.profileUrl || prev.brand.headerCtaUrl,
        curatorAvatarUrl: profile.avatarUrl || prev.brand.curatorAvatarUrl,
      },
    }));
  };

  const handleImportSpotifyPlaylists = (imported: Playlist[]) => {
    setDraft((prev) => {
      const existingById = new Map(prev.playlists.map((p) => [p.id, p]));
      for (const pl of imported) {
        const prevItem = existingById.get(pl.id);
        existingById.set(
          pl.id,
          prevItem
            ? {
                ...pl,
                featured: prevItem.featured,
                visible: prevItem.visible,
                customButtons: prevItem.customButtons,
              }
            : pl
        );
      }
      const nextList = Array.from(existingById.values());
      if (imported[0]) {
        setSelectedPlaylistId(imported[0].id);
      }
      return { ...prev, playlists: nextList };
    });
  };

  const renderButtonsEditor = (
    title: string,
    subtitle: string,
    buttons: ActionButton[],
    onChange: (next: ActionButton[]) => void
  ) => {
    const moveBtn = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= buttons.length) return;
      const copy = [...buttons];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      onChange(copy);
    };

    const addBtn = () => {
      onChange([
        ...buttons,
        {
          id: createId('btn'),
          label: 'New Link Button',
          url: 'https://open.spotify.com/',
          icon: 'external',
          variant: 'outline',
          actionType: 'link',
          visible: true,
        },
      ]);
    };

    return (
      <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
            <p className="text-xs sm:text-sm text-zinc-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={addBtn}
            style={{ backgroundColor: accent, color: accentText }}
            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Button</span>
          </button>
        </div>

        <div className="space-y-3">
          {buttons.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">No buttons configured.</p>
          ) : (
            buttons.map((btn, idx) => (
              <div
                key={btn.id}
                className="p-4 rounded-xl border border-zinc-800/90 bg-[#0A0A0D] space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <IconGlyph name={btn.icon} className="w-4 h-4 text-zinc-200" />
                    <span className="font-medium text-zinc-200">{btn.label || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          buttons.map((b) => (b.id === btn.id ? { ...b, visible: !b.visible } : b))
                        )
                      }
                      title={btn.visible ? 'Hide button' : 'Show button'}
                      className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                    >
                      {btn.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveBtn(idx, -1)}
                      className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === buttons.length - 1}
                      onClick={() => moveBtn(idx, 1)}
                      className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(buttons.filter((b) => b.id !== btn.id))}
                      className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Label</label>
                    <input
                      type="text"
                      value={btn.label}
                      onChange={(e) =>
                        onChange(
                          buttons.map((b) =>
                            b.id === btn.id ? { ...b, label: e.target.value } : b
                          )
                        )
                      }
                      className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      Destination URL (or text to copy)
                    </label>
                    <input
                      type="text"
                      value={btn.url}
                      onChange={(e) =>
                        onChange(
                          buttons.map((b) => (b.id === btn.id ? { ...b, url: e.target.value } : b))
                        )
                      }
                      className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Icon</label>
                    <select
                      value={btn.icon}
                      onChange={(e) =>
                        onChange(
                          buttons.map((b) =>
                            b.id === btn.id
                              ? { ...b, icon: e.target.value as ButtonIconName }
                              : b
                          )
                        )
                      }
                      className="w-full h-10 px-2.5 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white focus:outline-none focus:border-zinc-500"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Style</label>
                      <select
                        value={btn.variant}
                        onChange={(e) =>
                          onChange(
                            buttons.map((b) =>
                              b.id === btn.id
                                ? { ...b, variant: e.target.value as ButtonVariant }
                                : b
                            )
                          )
                        }
                        className="w-full h-10 px-2 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white focus:outline-none focus:border-zinc-500"
                      >
                        <option value="accent">Accent</option>
                        <option value="outline">Outline</option>
                        <option value="subtle">Subtle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Action</label>
                      <select
                        value={btn.actionType}
                        onChange={(e) =>
                          onChange(
                            buttons.map((b) =>
                              b.id === btn.id
                                ? { ...b, actionType: e.target.value as ButtonActionType }
                                : b
                            )
                          )
                        }
                        className="w-full h-10 px-2 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white focus:outline-none focus:border-zinc-500"
                      >
                        <option value="link">Open URL</option>
                        <option value="featured_drawer">Open Featured</option>
                        <option value="scroll_playlists">Scroll Playlists</option>
                        <option value="copy_url">Copy Link</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F4F4F5] flex flex-col">
      {/* Studio Top Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-[#08080B]/95 backdrop-blur-md">
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-base sm:text-lg font-semibold text-white">
              {draft.brand.domainName}
            </span>
            <span className="text-zinc-600" aria-hidden="true">
              /
            </span>
            <span className="text-xs sm:text-sm text-zinc-400">Admin Studio</span>
            {isDirty && (
              <span className="text-xs text-amber-300 font-medium">· Unsaved edits</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-xs font-medium text-zinc-200 whitespace-nowrap cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Showcase</span>
            </button>

            <button
              type="button"
              onClick={exportConfigJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800 text-xs font-medium text-zinc-200 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={{ backgroundColor: accent, color: accentText }}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer hover:opacity-95"
            >
              {isDirty ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isDirty ? 'Save Changes' : 'Saved'}</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-400 hover:text-white whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="max-w-[1320px] mx-auto px-5 sm:px-6 lg:px-8 border-t border-zinc-800/70 flex items-center gap-2 overflow-x-auto py-2">
          {(
            [
              { id: 'playlists', label: 'Playlists & Tracks' },
              { id: 'copy', label: 'Page & Hero Copy' },
              { id: 'buttons', label: 'Clickable Buttons' },
              { id: 'theme', label: 'Theme, Backup & Auth' },
            ] as { id: AdminTab; label: string }[]
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 min-h-[38px] rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Workspace Body */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-5 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: PLAYLISTS & TRACKS */}
        {activeTab === 'playlists' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Playlist Selector Sidebar */}
            <aside className="lg:col-span-4 rounded-2xl border border-zinc-800 bg-[#111113] p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-white">
                  Playlists ({draft.playlists.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSpotifyImportOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white cursor-pointer"
                  >
                    <IconGlyph name="spotify" className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPlaylist}
                    style={{ backgroundColor: accent, color: accentText }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {draft.playlists.map((pl, idx) => {
                  const isSelected = selectedPlaylist?.id === pl.id;
                  return (
                    <div
                      key={pl.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isSelected
                          ? 'border-zinc-500 bg-[#18181D]'
                          : 'border-zinc-800/80 bg-[#0B0B0E] hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPlaylistId(pl.id)}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-800 shrink-0 cursor-pointer"
                        >
                          <ResilientImage
                            src={pl.coverUrl}
                            alt={pl.title}
                            fallbackTitle={pl.title}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlaylistId(pl.id)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <p className="text-sm font-medium text-white truncate">{pl.title}</p>
                          <p className="text-xs text-zinc-400 truncate">
                            {pl.mood} · {pl.tracks.length} tracks
                            {!pl.visible ? ' · Hidden' : ''}
                          </p>
                        </button>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-zinc-800/70 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetFeatured(pl.id)}
                            title="Set as featured spotlight"
                            className={`p-1.5 rounded-md border text-xs cursor-pointer ${
                              pl.featured
                                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                                : 'border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft((prev) => ({
                                ...prev,
                                playlists: prev.playlists.map((item) =>
                                  item.id === pl.id ? { ...item, visible: !item.visible } : item
                                ),
                              }))
                            }
                            title={pl.visible ? 'Hide from public page' : 'Show on public page'}
                            className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            {pl.visible ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicatePlaylist(pl)}
                            title="Duplicate playlist"
                            className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePlaylist(idx, -1)}
                            title="Move up"
                            className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.playlists.length - 1}
                            onClick={() => handleMovePlaylist(idx, 1)}
                            title="Move down"
                            className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlaylist(pl.id)}
                            title="Delete playlist"
                            className="p-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Selected Playlist Editor */}
            <div className="lg:col-span-8 space-y-6">
              {!selectedPlaylist ? (
                <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-12 text-center space-y-3">
                  <p className="text-base font-medium text-white">No playlist selected</p>
                  <button
                    type="button"
                    onClick={handleAddPlaylist}
                    style={{ backgroundColor: accent, color: accentText }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Playlist</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Playlist Core Details */}
                  <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                      <h3 className="font-display text-lg font-semibold text-white">
                        Playlist Details
                      </h3>
                      <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPlaylist.featured}
                          onChange={() => handleSetFeatured(selectedPlaylist.id)}
                          className="rounded border-zinc-700"
                        />
                        <span>Featured Spotlight</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1.5">Title</label>
                        <input
                          type="text"
                          value={selectedPlaylist.title}
                          onChange={(e) =>
                            updateSelectedPlaylist((pl) => ({ ...pl, title: e.target.value }))
                          }
                          className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5">
                          Mood / Filter Category
                        </label>
                        <input
                          type="text"
                          value={selectedPlaylist.mood}
                          onChange={(e) =>
                            updateSelectedPlaylist((pl) => ({ ...pl, mood: e.target.value }))
                          }
                          className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1.5">Year</label>
                        <input
                          type="text"
                          value={selectedPlaylist.year}
                          onChange={(e) =>
                            updateSelectedPlaylist((pl) => ({ ...pl, year: e.target.value }))
                          }
                          className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1.5">
                          Spotify Playlist URL
                        </label>
                        <input
                          type="url"
                          value={selectedPlaylist.spotifyUrl}
                          onChange={(e) =>
                            updateSelectedPlaylist((pl) => ({
                              ...pl,
                              spotifyUrl: e.target.value,
                            }))
                          }
                          className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-2">
                        <label className="block text-xs text-zinc-400">
                          Cover Artwork URL (or pick a preset below)
                        </label>
                        <input
                          type="text"
                          value={selectedPlaylist.coverUrl}
                          onChange={(e) =>
                            updateSelectedPlaylist((pl) => ({ ...pl, coverUrl: e.target.value }))
                          }
                          className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {PRESET_ARTWORK.map((art) => (
                            <button
                              key={art.label}
                              type="button"
                              onClick={() =>
                                updateSelectedPlaylist((pl) => ({ ...pl, coverUrl: art.url }))
                              }
                              className="inline-flex items-center gap-2 pr-2.5 pl-1 py-1 rounded-lg border border-zinc-800 bg-[#0A0A0D] hover:border-zinc-600 text-xs text-zinc-300 cursor-pointer"
                            >
                              <img
                                src={art.url}
                                alt={art.label}
                                className="w-6 h-6 rounded object-cover"
                              />
                              <span>{art.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1.5">
                          Short Description
                        </label>
                        <textarea
                          rows={2}
                          value={selectedPlaylist.description}
                          onChange={(e) =>
                            updateSelectedPlaylist((pl) => ({
                              ...pl,
                              description: e.target.value,
                            }))
                          }
                          className="w-full p-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1.5">
                          Curator Liner Notes (Shown inside Tracklist Drawer)
                        </label>
                        <textarea
                          rows={2}
                          value={selectedPlaylist.curatorNote}
                          onChange={(e) =>
                            updateSelectedPlaylist((pl) => ({
                              ...pl,
                              curatorNote: e.target.value,
                            }))
                          }
                          className="w-full p-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white focus:outline-none focus:border-zinc-500"
                        />
                      </div>
                    </div>

                    {/* Playlist-specific clickable buttons */}
                    <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-zinc-300">
                          Extra Clickable Buttons on This Playlist
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedPlaylist((pl) => ({
                              ...pl,
                              customButtons: [
                                ...pl.customButtons,
                                {
                                  id: createId('plbtn'),
                                  label: 'Apple Music',
                                  url: 'https://music.apple.com/',
                                  icon: 'music',
                                },
                              ],
                            }))
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Playlist Button</span>
                        </button>
                      </div>

                      {selectedPlaylist.customButtons.map((cbtn) => (
                        <div
                          key={cbtn.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                        >
                          <input
                            type="text"
                            placeholder="Label"
                            value={cbtn.label}
                            onChange={(e) =>
                              updateSelectedPlaylist((pl) => ({
                                ...pl,
                                customButtons: pl.customButtons.map((b) =>
                                  b.id === cbtn.id ? { ...b, label: e.target.value } : b
                                ),
                              }))
                            }
                            className="sm:col-span-3 h-10 px-3 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-xs text-white"
                          />
                          <input
                            type="text"
                            placeholder="URL"
                            value={cbtn.url}
                            onChange={(e) =>
                              updateSelectedPlaylist((pl) => ({
                                ...pl,
                                customButtons: pl.customButtons.map((b) =>
                                  b.id === cbtn.id ? { ...b, url: e.target.value } : b
                                ),
                              }))
                            }
                            className="sm:col-span-5 h-10 px-3 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-xs text-white"
                          />
                          <select
                            value={cbtn.icon}
                            onChange={(e) =>
                              updateSelectedPlaylist((pl) => ({
                                ...pl,
                                customButtons: pl.customButtons.map((b) =>
                                  b.id === cbtn.id
                                    ? { ...b, icon: e.target.value as ButtonIconName }
                                    : b
                                ),
                              }))
                            }
                            className="sm:col-span-3 h-10 px-2.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-xs text-white"
                          >
                            {ICON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedPlaylist((pl) => ({
                                ...pl,
                                customButtons: pl.customButtons.filter((b) => b.id !== cbtn.id),
                              }))
                            }
                            className="sm:col-span-1 h-10 rounded-lg border border-zinc-800 text-zinc-400 hover:text-rose-400 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracklist Editor */}
                  <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-white">
                          Tracklist ({selectedPlaylist.tracks.length})
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Tracks appear inside the interactive slide-over drawer.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedPlaylist((pl) => ({
                            ...pl,
                            tracks: [
                              ...pl.tracks,
                              {
                                id: createId('tr'),
                                title: 'New Track',
                                artist: 'Artist Name',
                                duration: '3:30',
                                spotifyTrackUrl: pl.spotifyUrl,
                              },
                            ],
                          }))
                        }
                        style={{ backgroundColor: accent, color: accentText }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Track</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {selectedPlaylist.tracks.map((tr, idx) => {
                        const features = resolveTrackAudioFeatures(tr, selectedPlaylist.mood);
                        return (
                          <div
                            key={tr.id}
                            className="p-3 rounded-xl border border-zinc-800/80 bg-[#0A0A0D] space-y-2.5"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                              <div className="sm:col-span-4">
                                <input
                                  type="text"
                                  placeholder="Track Title"
                                  value={tr.title}
                                  onChange={(e) =>
                                    updateSelectedPlaylist((pl) => ({
                                      ...pl,
                                      tracks: pl.tracks.map((item) =>
                                        item.id === tr.id
                                          ? { ...item, title: e.target.value }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="w-full h-9 px-3 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <input
                                  type="text"
                                  placeholder="Artist"
                                  value={tr.artist}
                                  onChange={(e) =>
                                    updateSelectedPlaylist((pl) => ({
                                      ...pl,
                                      tracks: pl.tracks.map((item) =>
                                        item.id === tr.id
                                          ? { ...item, artist: e.target.value }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="w-full h-9 px-3 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  placeholder="3:45"
                                  value={tr.duration}
                                  onChange={(e) =>
                                    updateSelectedPlaylist((pl) => ({
                                      ...pl,
                                      tracks: pl.tracks.map((item) =>
                                        item.id === tr.id
                                          ? { ...item, duration: e.target.value }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="w-full h-9 px-2.5 rounded-lg border border-zinc-800 bg-[#111113] text-xs font-mono-tabular text-white"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  placeholder="Spotify track URL"
                                  value={tr.spotifyTrackUrl}
                                  onChange={(e) =>
                                    updateSelectedPlaylist((pl) => ({
                                      ...pl,
                                      tracks: pl.tracks.map((item) =>
                                        item.id === tr.id
                                          ? { ...item, spotifyTrackUrl: e.target.value }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="w-full h-9 px-2.5 rounded-lg border border-zinc-800 bg-[#111113] text-xs text-white"
                                />
                              </div>
                              <div className="sm:col-span-1 flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() =>
                                    updateSelectedPlaylist((pl) => {
                                      const copy = [...pl.tracks];
                                      const [m] = copy.splice(idx, 1);
                                      copy.splice(idx - 1, 0, m);
                                      return { ...pl, tracks: copy };
                                    })
                                  }
                                  className="p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSelectedPlaylist((pl) => ({
                                      ...pl,
                                      tracks: pl.tracks.filter((item) => item.id !== tr.id),
                                    }))
                                  }
                                  className="p-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-zinc-800/60">
                              {(
                                [
                                  { key: 'energy', label: 'Energy' },
                                  { key: 'acousticness', label: 'Acousticness' },
                                  { key: 'valence', label: 'Valence' },
                                ] as const
                              ).map((metric) => {
                                const pct = Math.round(features[metric.key] * 100);
                                return (
                                  <label
                                    key={metric.key}
                                    className="flex items-center gap-2 text-[11px] text-zinc-400"
                                  >
                                    <span className="w-20 shrink-0">{metric.label}</span>
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      value={pct}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) / 100;
                                        updateSelectedPlaylist((pl) => ({
                                          ...pl,
                                          tracks: pl.tracks.map((item) =>
                                            item.id === tr.id
                                              ? {
                                                  ...item,
                                                  audioFeatures: {
                                                    ...features,
                                                    [metric.key]: val,
                                                  },
                                                }
                                              : item
                                          ),
                                        }));
                                      }}
                                      className="flex-1 accent-[#1DB954] cursor-pointer"
                                    />
                                    <span className="w-8 text-right font-mono-tabular text-zinc-300">
                                      {pct}%
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PAGE & HERO COPY */}
        {activeTab === 'copy' && (
          <div className="space-y-6 max-w-4xl">
            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-white">
                Brand, Header & Footer
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Domain / Brand Wordmark</label>
                  <input
                    type="text"
                    value={draft.brand.domainName}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, domainName: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Header CTA Button Label</label>
                  <input
                    type="text"
                    value={draft.brand.headerCtaLabel}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, headerCtaLabel: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Header CTA URL</label>
                  <input
                    type="text"
                    value={draft.brand.headerCtaUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, headerCtaUrl: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Curator Name</label>
                  <input
                    type="text"
                    value={draft.brand.curatorName}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, curatorName: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Curator Role</label>
                  <input
                    type="text"
                    value={draft.brand.curatorRole}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, curatorRole: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Profile Label</label>
                  <input
                    type="text"
                    value={draft.brand.profileLabel}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, profileLabel: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Spotify Handle</label>
                  <input
                    type="text"
                    value={draft.brand.spotifyHandle}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, spotifyHandle: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Followers Count</label>
                  <input
                    type="text"
                    value={draft.brand.followersCount}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, followersCount: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Following Count</label>
                  <input
                    type="text"
                    value={draft.brand.followingCount}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, followingCount: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Spotify Profile URL
                  </label>
                  <input
                    type="url"
                    value={draft.brand.spotifyProfileUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, spotifyProfileUrl: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Curator Avatar URL</label>
                  <input
                    type="text"
                    value={draft.brand.curatorAvatarUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, curatorAvatarUrl: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Footer Copyright</label>
                  <input
                    type="text"
                    value={draft.brand.footerCopyright}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, footerCopyright: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Footer Subline</label>
                  <input
                    type="text"
                    value={draft.brand.footerSubline}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, footerSubline: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-white">Hero Section</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Hero Kicker</label>
                  <input
                    type="text"
                    value={draft.hero.kicker}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, kicker: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Headline Lead</label>
                  <input
                    type="text"
                    value={draft.hero.headlineLead}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, headlineLead: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Headline Italic Accent
                  </label>
                  <input
                    type="text"
                    value={draft.hero.headlineItalic}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, headlineItalic: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Hero Subheadline</label>
                  <textarea
                    rows={3}
                    value={draft.hero.subheadline}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, subheadline: e.target.value },
                      }))
                    }
                    className="w-full p-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Hero Image URL</label>
                  <input
                    type="text"
                    value={draft.hero.heroImageUrl}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, heroImageUrl: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Hero Image Caption</label>
                  <input
                    type="text"
                    value={draft.hero.heroImageCaption}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, heroImageCaption: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-lg font-semibold text-white">
                Playlists & Curator Section Copy
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Playlists Section Heading
                  </label>
                  <input
                    type="text"
                    value={draft.theme.playlistsHeading}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, playlistsHeading: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Curator Section Kicker
                  </label>
                  <input
                    type="text"
                    value={draft.curator.heading}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        curator: { ...prev.curator, heading: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Playlists Subheading
                  </label>
                  <input
                    type="text"
                    value={draft.theme.playlistsSubheading}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, playlistsSubheading: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Curator Quote</label>
                  <textarea
                    rows={2}
                    value={draft.curator.quote}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        curator: { ...prev.curator, quote: e.target.value },
                      }))
                    }
                    className="w-full p-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5">Curator Bio</label>
                  <textarea
                    rows={3}
                    value={draft.curator.bio}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        curator: { ...prev.curator, bio: e.target.value },
                      }))
                    }
                    className="w-full p-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Connect Heading</label>
                  <input
                    type="text"
                    value={draft.curator.connectHeading}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        curator: { ...prev.curator, connectHeading: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Connect Subtext</label>
                  <input
                    type="text"
                    value={draft.curator.connectSubtext}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        curator: { ...prev.curator, connectSubtext: e.target.value },
                      }))
                    }
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLICKABLE BUTTONS */}
        {activeTab === 'buttons' && (
          <div className="space-y-6 max-w-5xl">
            {renderButtonsEditor(
              'Hero Clickable Buttons',
              'Customize the primary and secondary action buttons directly beneath your hero headline.',
              draft.hero.actionButtons,
              (next) =>
                setDraft((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, actionButtons: next },
                }))
            )}

            {renderButtonsEditor(
              'Curator & Connect Link Buttons',
              'Add clickable Spotify, social, or custom destination buttons in the lower Connect section.',
              draft.curator.socialButtons,
              (next) =>
                setDraft((prev) => ({
                  ...prev,
                  curator: { ...prev.curator, socialButtons: next },
                }))
            )}
          </div>
        )}

        {/* TAB 4: THEME, BACKUP & AUTH */}
        {activeTab === 'theme' && (
          <div className="space-y-6 max-w-4xl">
            {/* Visual Theme Controls */}
            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-5">
              <h2 className="font-display text-lg font-semibold text-white">
                Accent Color & Layout
              </h2>

              <div className="space-y-2.5">
                <label className="block text-xs text-zinc-400">Primary Accent Color</label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {ACCENT_SWATCHES.map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, accentColor: sw.hex },
                        }))
                      }
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer ${
                        draft.theme.accentColor.toLowerCase() === sw.hex.toLowerCase()
                          ? 'border-white bg-zinc-800 text-white'
                          : 'border-zinc-800 bg-[#0A0A0D] text-zinc-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span>{sw.name}</span>
                    </button>
                  ))}

                  <div className="flex items-center gap-2 pl-2">
                    <input
                      type="color"
                      aria-label="Custom accent color picker"
                      value={draft.theme.accentColor}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, accentColor: e.target.value },
                        }))
                      }
                      className="w-9 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={draft.theme.accentColor}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, accentColor: e.target.value },
                        }))
                      }
                      className="w-24 h-9 px-2.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-xs font-mono-tabular text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Playlist Grid Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bento', 'grid'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, layoutMode: mode },
                          }))
                        }
                        className={`h-10 rounded-lg border text-xs font-medium capitalize cursor-pointer ${
                          draft.theme.layoutMode === mode
                            ? 'border-white bg-zinc-800 text-white'
                            : 'border-zinc-800 bg-[#0A0A0D] text-zinc-400'
                        }`}
                      >
                        {mode === 'bento' ? 'Bento Grid' : 'Uniform Grid'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Marquee Divider Text
                  </label>
                  <input
                    type="text"
                    value={draft.theme.marqueeText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, marqueeText: e.target.value },
                      }))
                    }
                    className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-[#0A0A0D] text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.theme.showStats}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, showStats: e.target.checked },
                      }))
                    }
                  />
                  <span>Show Collection Metrics</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-[#0A0A0D] text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.theme.showMarquee}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, showMarquee: e.target.checked },
                      }))
                    }
                  />
                  <span>Show Marquee Ribbon</span>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-800 bg-[#0A0A0D] text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.theme.showCuratorSection}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, showCuratorSection: e.target.checked },
                      }))
                    }
                  />
                  <span>Show Curator & Connect</span>
                </label>
              </div>
            </div>

            {/* Static Site Backup & Publishing */}
            <div className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-semibold text-white">
                  Static Publishing & Backup
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Edits save automatically to this browser. Export{' '}
                  <code className="font-mono-tabular text-zinc-200">site-config.json</code> to
                  publish your updated playlists globally as a static file on your free host.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={exportConfigJson}
                  style={{ backgroundColor: accent, color: accentText }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export site-config.json</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-lg border border-zinc-800 bg-[#0A0A0D] hover:bg-zinc-900 text-xs sm:text-sm font-medium text-zinc-200 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import JSON Bundle</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />

                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-lg border border-zinc-800 hover:border-rose-500/50 text-xs sm:text-sm font-medium text-zinc-400 hover:text-rose-300 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset to Defaults</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetConfig();
                        setConfirmReset(false);
                      }}
                      className="px-3.5 py-2 min-h-[40px] rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-2 min-h-[40px] rounded-lg border border-zinc-800 text-xs text-zinc-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Credentials Updater */}
            <form
              onSubmit={handleAuthUpdate}
              className="rounded-2xl border border-zinc-800 bg-[#111113] p-5 sm:p-6 space-y-4"
            >
              <div className="space-y-1">
                <h2 className="font-display text-lg font-semibold text-white">
                  Admin Login Credentials
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Update the User ID and Password required on{' '}
                  <code className="font-mono-tabular text-zinc-200">/adminlogin</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPasswd}
                    onChange={(e) => setCurrentPasswd(e.target.value)}
                    required
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">New User ID</label>
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    required
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPasswd}
                    onChange={(e) => setNewPasswd(e.target.value)}
                    required
                    minLength={6}
                    className="w-full h-11 px-3.5 rounded-lg border border-zinc-800 bg-[#0A0A0D] text-sm text-white"
                  />
                </div>
              </div>

              {authStatus && (
                <p
                  className={`text-xs ${
                    authStatus.ok ? 'text-[#1DB954]' : 'text-rose-400'
                  }`}
                >
                  {authStatus.msg}
                </p>
              )}

              <button
                type="submit"
                className="px-4 py-2.5 min-h-[40px] rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs sm:text-sm font-medium text-white cursor-pointer"
              >
                Update Credentials
              </button>
            </form>
          </div>
        )}
      </main>

      <SpotifyImportModal
        open={spotifyImportOpen}
        accentColor={accent}
        onClose={() => setSpotifyImportOpen(false)}
        onSyncProfile={handleSyncSpotifyProfile}
        onImportPlaylists={handleImportSpotifyPlaylists}
      />
    </div>
  );
};
