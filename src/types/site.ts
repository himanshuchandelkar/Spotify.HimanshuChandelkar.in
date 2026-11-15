export type ButtonIconName =
  | 'spotify'
  | 'disc'
  | 'headphones'
  | 'external'
  | 'radio'
  | 'heart'
  | 'share'
  | 'music'
  | 'globe';

export type ButtonVariant = 'accent' | 'outline' | 'subtle';

export type ButtonActionType = 'link' | 'featured_drawer' | 'copy_url' | 'scroll_playlists';

export interface ActionButton {
  id: string;
  label: string;
  url: string;
  icon: ButtonIconName;
  variant: ButtonVariant;
  actionType: ButtonActionType;
  visible: boolean;
}

export interface AudioFeatures {
  energy: number;
  acousticness: number;
  valence: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  spotifyTrackUrl: string;
  audioFeatures?: AudioFeatures;
}

export interface PlaylistButton {
  id: string;
  label: string;
  url: string;
  icon: ButtonIconName;
}

export interface Playlist {
  id: string;
  title: string;
  mood: string;
  year: string;
  description: string;
  curatorNote: string;
  coverUrl: string;
  spotifyUrl: string;
  featured: boolean;
  visible: boolean;
  customButtons: PlaylistButton[];
  tracks: Track[];
}

export interface BrandConfig {
  domainName: string;
  curatorName: string;
  curatorRole: string;
  spotifyHandle: string;
  profileLabel: string;
  followersCount: string;
  followingCount: string;
  spotifyProfileUrl: string;
  curatorAvatarUrl: string;
  headerCtaLabel: string;
  headerCtaUrl: string;
  footerCopyright: string;
  footerSubline: string;
}

export interface HeroConfig {
  kicker: string;
  headlineLead: string;
  headlineItalic: string;
  subheadline: string;
  heroImageUrl: string;
  heroImageCaption: string;
  actionButtons: ActionButton[];
}

export interface CuratorSectionConfig {
  heading: string;
  quote: string;
  bio: string;
  connectHeading: string;
  connectSubtext: string;
  socialButtons: ActionButton[];
}

export interface ThemeConfig {
  accentColor: string;
  layoutMode: 'bento' | 'grid';
  marqueeText: string;
  showMarquee: boolean;
  showStats: boolean;
  showCuratorSection: boolean;
  playlistsHeading: string;
  playlistsSubheading: string;
}

export interface SiteConfig {
  version: number;
  brand: BrandConfig;
  hero: HeroConfig;
  curator: CuratorSectionConfig;
  theme: ThemeConfig;
  playlists: Playlist[];
}

export interface AdminAuthRecord {
  userId: string;
  passwordHash: string;
  updatedAt: string;
}
