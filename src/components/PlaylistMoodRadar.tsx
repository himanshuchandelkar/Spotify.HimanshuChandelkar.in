import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AudioFeatures, Track } from '../types/site';
import {
  computePlaylistMoodAverages,
  resolveTrackAudioFeatures,
} from '../utils/audioFeatures';

interface PlaylistMoodRadarProps {
  tracks: Track[];
  playlistMood: string;
  accentColor: string;
  hoveredTrack: Track | null;
}

interface AxisDatum {
  key: keyof AudioFeatures;
  label: string;
  value: number;
  trackValue: number | null;
  angle: number;
}

const AXES: { key: keyof AudioFeatures; label: string }[] = [
  { key: 'energy', label: 'Energy' },
  { key: 'acousticness', label: 'Acousticness' },
  { key: 'valence', label: 'Valence' },
];

export const PlaylistMoodRadar: React.FC<PlaylistMoodRadarProps> = ({
  tracks,
  playlistMood,
  accentColor,
  hoveredTrack,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredAxis, setHoveredAxis] = useState<keyof AudioFeatures | null>(null);

  const averages = useMemo(
    () => computePlaylistMoodAverages(tracks, playlistMood),
    [tracks, playlistMood]
  );

  const hoveredFeatures = useMemo(
    () => (hoveredTrack ? resolveTrackAudioFeatures(hoveredTrack, playlistMood) : null),
    [hoveredTrack, playlistMood]
  );

  const axisData = useMemo<AxisDatum[]>(() => {
    const step = (Math.PI * 2) / AXES.length;
    return AXES.map((axis, idx) => ({
      key: axis.key,
      label: axis.label,
      value: averages[axis.key],
      trackValue: hoveredFeatures ? hoveredFeatures[axis.key] : null,
      angle: idx * step,
    }));
  }, [averages, hoveredFeatures]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || tracks.length === 0) return;

    const width = 240;
    const height = 220;
    const cx = width / 2;
    const cy = height / 2 + 8;
    const maxRadius = 70;
    const levels = [0.25, 0.5, 0.75, 1];

    const rScale = d3.scaleLinear().domain([0, 1]).range([0, maxRadius]);
    const radialLine = d3
      .lineRadial<AxisDatum>()
      .angle((d) => d.angle)
      .radius((d) => rScale(d.value))
      .curve(d3.curveLinearClosed);

    const trackRadialLine = d3
      .lineRadial<AxisDatum>()
      .angle((d) => d.angle)
      .radius((d) => rScale(d.trackValue ?? d.value))
      .curve(d3.curveLinearClosed);

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const root = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${cx}, ${cy})`);

    // Concentric polygon grid rings
    const ringPoints = (level: number) =>
      axisData.map((d) => ({
        ...d,
        value: level,
      }));

    levels.forEach((level) => {
      root
        .append('path')
        .datum(ringPoints(level))
        .attr('d', radialLine)
        .attr('fill', 'none')
        .attr('stroke', level === 1 ? '#3F3F46' : '#27272A')
        .attr('stroke-width', level === 1 ? 1.2 : 1);
    });

    // Radial spokes & axis labels
    axisData.forEach((axis) => {
      const sin = Math.sin(axis.angle);
      const cos = Math.cos(axis.angle);
      const x2 = maxRadius * sin;
      const y2 = -maxRadius * cos;

      root
        .append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#27272A')
        .attr('stroke-width', 1);

      const labelRadius = maxRadius + 20;
      const lx = labelRadius * sin;
      const ly = -labelRadius * cos;

      const textAnchor =
        Math.abs(sin) < 0.15 ? 'middle' : sin > 0 ? 'start' : 'end';

      root
        .append('text')
        .attr('x', lx)
        .attr('y', ly + (cos > 0.5 ? -2 : 4))
        .attr('text-anchor', textAnchor)
        .attr('fill', hoveredAxis === axis.key ? '#FFFFFF' : '#A1A1AA')
        .attr('font-size', '11px')
        .attr('font-weight', hoveredAxis === axis.key ? '600' : '500')
        .text(axis.label);
    });

    // Playlist average polygon area + stroke
    root
      .append('path')
      .datum(axisData)
      .attr('d', radialLine)
      .attr('fill', accentColor)
      .attr('fill-opacity', 0.22)
      .attr('stroke', accentColor)
      .attr('stroke-width', 2);

    // Individual track overlay polygon when hovering a track row
    if (hoveredFeatures) {
      root
        .append('path')
        .datum(axisData)
        .attr('d', trackRadialLine)
        .attr('fill', '#F4F4F5')
        .attr('fill-opacity', 0.1)
        .attr('stroke', '#F4F4F5')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4 3');
    }

    // Vertex nodes for playlist average
    root
      .selectAll('.mood-vertex')
      .data(axisData)
      .enter()
      .append('circle')
      .attr('class', 'mood-vertex')
      .attr('cx', (d) => rScale(d.value) * Math.sin(d.angle))
      .attr('cy', (d) => -rScale(d.value) * Math.cos(d.angle))
      .attr('r', (d) => (hoveredAxis === d.key ? 5 : 3.75))
      .attr('fill', accentColor)
      .attr('stroke', '#0D0D10')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setHoveredAxis(d.key))
      .on('mouseleave', () => setHoveredAxis(null));
  }, [axisData, accentColor, hoveredAxis, hoveredFeatures, tracks.length]);

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#141418] border border-zinc-800/80 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-white">Playlist Mood</h3>
          <p className="text-xs text-zinc-400">
            {hoveredTrack
              ? `Comparing: ${hoveredTrack.title}`
              : 'Average audio profile across all tracks'}
          </p>
        </div>
        {hoveredTrack && (
          <span className="text-[11px] font-mono-tabular text-zinc-300 shrink-0">
            Dashed = Track
          </span>
        )}
      </div>

      {tracks.length === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-500">
          Add tracks to visualize Energy, Acousticness, and Valence.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-6 flex items-center justify-center">
            <svg
              ref={svgRef}
              role="img"
              aria-label="Playlist Mood radar chart showing Energy, Acousticness, and Valence"
              className="w-full max-w-[240px] h-auto overflow-visible"
            />
          </div>

          <div className="sm:col-span-6 space-y-3">
            {axisData.map((axis) => {
              const avgPct = Math.round(axis.value * 100);
              const trkPct =
                axis.trackValue !== null ? Math.round(axis.trackValue * 100) : null;
              const isHighlighted = hoveredAxis === axis.key;

              return (
                <div
                  key={axis.key}
                  onMouseEnter={() => setHoveredAxis(axis.key)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    isHighlighted ? 'bg-zinc-800/60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-zinc-300">{axis.label}</span>
                    <span className="font-mono-tabular text-zinc-200">
                      {avgPct}%
                      {trkPct !== null && (
                        <span className="text-zinc-400"> ({trkPct}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${avgPct}%`,
                        backgroundColor: accentColor,
                      }}
                    />
                    {trkPct !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `calc(${trkPct}% - 1px)` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
