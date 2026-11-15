import { AudioFeatures, Track } from '../types/site';

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function getMoodBaseline(mood: string): AudioFeatures {
  const m = mood.toLowerCase();
  if (m.includes('acoustic') || m.includes('morning') || m.includes('folk') || m.includes('chill')) {
    return { energy: 0.28, acousticness: 0.86, valence: 0.45 };
  }
  if (m.includes('focus') || m.includes('synth') || m.includes('techno') || m.includes('workout')) {
    return { energy: 0.82, acousticness: 0.12, valence: 0.34 };
  }
  if (m.includes('soul') || m.includes('jazz') || m.includes('funk') || m.includes('groove')) {
    return { energy: 0.54, acousticness: 0.55, valence: 0.72 };
  }
  if (m.includes('night') || m.includes('ambient') || m.includes('dark')) {
    return { energy: 0.62, acousticness: 0.24, valence: 0.32 };
  }
  return { energy: 0.58, acousticness: 0.42, valence: 0.54 };
}

export function resolveTrackAudioFeatures(track: Track, playlistMood = ''): AudioFeatures {
  if (track.audioFeatures) {
    return {
      energy: clampUnit(track.audioFeatures.energy),
      acousticness: clampUnit(track.audioFeatures.acousticness),
      valence: clampUnit(track.audioFeatures.valence),
    };
  }

  const base = getMoodBaseline(playlistMood);
  const s1 = hashSeed(`${track.id}:${track.title}:e`);
  const s2 = hashSeed(`${track.id}:${track.artist}:a`);
  const s3 = hashSeed(`${track.title}:${track.artist}:v`);

  return {
    energy: clampUnit(base.energy + (s1 - 0.5) * 0.24),
    acousticness: clampUnit(base.acousticness + (s2 - 0.5) * 0.24),
    valence: clampUnit(base.valence + (s3 - 0.5) * 0.24),
  };
}

export function computePlaylistMoodAverages(
  tracks: Track[],
  playlistMood = ''
): AudioFeatures {
  if (tracks.length === 0) {
    return { energy: 0, acousticness: 0, valence: 0 };
  }
  const totals = tracks.reduce(
    (acc, tr) => {
      const f = resolveTrackAudioFeatures(tr, playlistMood);
      return {
        energy: acc.energy + f.energy,
        acousticness: acc.acousticness + f.acousticness,
        valence: acc.valence + f.valence,
      };
    },
    { energy: 0, acousticness: 0, valence: 0 }
  );

  return {
    energy: totals.energy / tracks.length,
    acousticness: totals.acousticness / tracks.length,
    valence: totals.valence / tracks.length,
  };
}
