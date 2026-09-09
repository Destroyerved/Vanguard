/**
 * VANGUARD — real-file media authenticity probe.
 *
 * Takes any audio/video file, extracts its ACTUAL bitstream properties with
 * ffprobe, maps them into the forensic signals the media pipeline consumes, and
 * runs the REAL evaluation path — the same `evaluateMediaAuthenticity` the
 * normalizers call for every ingested media event.
 *
 *   npx tsx scripts/media-probe.ts <file> [--source social_media|audio_recording]
 *
 * Honesty contract:
 *   - Codecs, container, muxer, bitrate, duration, framerate: measured.
 *   - Re-encoding chain: INFERRED from container tags (encoder, handler_name,
 *     DASH brands); a downloaded/re-muxed file is a transit step, never a
 *     fabrication claim.
 *   - Visual/temporal/PRNU/acoustic "content" checks have no real detector
 *     hooked up: they report the natural baseline unless the file flags a
 *     synthetic payload. Only provenance/container/bitstream checks pass real
 *     evidence through.
 *   - `--corroborated` simulates fusion corroboration (radar+incident at the
 *     same coordinates) purely as a hypothesis test of `classifyManipulation`,
 *     not as evidence about this file.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { evaluateMediaAuthenticity, refreshAuditCorroboration } from '../src/media/authenticity.js';
import type { UnifiedEvent } from '../src/types/events.js';

interface Stream {
  codec_type?: string;
  codec_long_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  sample_rate?: number;
  channels?: number;
}

interface Ffprobe {
  format: {
    format_name?: string;
    duration?: string;
    bit_rate?: string;
    size?: string;
    tags?: Record<string, string>;
  };
  streams: Stream[];
}

function runProbe(file: string): Ffprobe {
  return JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }),
  ) as Ffprobe;
}

function fractionToNumber(v: string | undefined): number {
  if (!v) return 0;
  const [a, b] = v.split('/');
  const den = Number(b);
  if (!den) return Number(a) || 0;
  return Number(a) / den;
}

function buildRaw(probe: Ffprobe): Record<string, unknown> {
  const fmt = probe.format;
  const tags = fmt.tags ?? {};
  const audio = probe.streams.find((s) => s.codec_type === 'audio');
  const video = probe.streams.find((s) => s.codec_type === 'video');
  const kind = video ? 'video' : audio ? 'audio' : 'image';
  const encoder = tags.encoder ?? '';
  const handler = tags.handler_name ?? '';

  // INFERRED provenance chain from container tags (transit, not fabrication).
  const reEncodingHistory: string[] = [];
  if (handler.includes('Google')) {
    reEncodingHistory.push(`Re-mux: Google platform (handler "${handler}")`);
  }
  if ((fmt.compatible_brands ?? '').includes('dash') || (fmt.major_brand ?? '').includes('dash')) {
    reEncodingHistory.push(`DASH segment repackage: ${fmt.major_brand ?? 'iso6'} (${fmt.minor_version ?? '0'})`);
  }
  if (encoder && !encoder.toLowerCase().includes('unk')) {
    reEncodingHistory.push(`Re-encode: ${encoder}`);
  }

  return {
    mediaKind: kind,
    container: fmt.format_name ?? 'UNKNOWN_CONTAINER',
    videoCodec: kind === 'video' ? video?.codec_long_name ?? 'UNKNOWN_CODEC' : 'N/A',
    audioCodec: audio ? audio.codec_long_name ?? 'UNKNOWN_CODEC' : 'N/A',
    resolution:
      kind === 'audio' ? 'N/A' : video && video.width ? `${video.width}x${video.height}` : 'UNKNOWN_RESOLUTION',
    frameRateFps: kind === 'video' ? Math.round(fractionToNumber(video?.avg_frame_rate)) : 0,
    sampleRateHz: audio?.sample_rate ? Number(audio.sample_rate) : 0,
    audioChannels: audio?.channels ?? 0,
    bitrateKbps: Math.round((Number(fmt.bit_rate) || 0) / 1000),
    durationSec: Math.round(Number(fmt.duration) || 0),
    creationTimestamp: tags.creation_time ?? new Date().toISOString(),
    fileSizeBytes: Number(fmt.size) || 0,
    softwareMuxer: encoder || 'UNKNOWN_MUXER',
    reEncodingHistory,
    c2paManifestIntact: false,
  };
}

function buildEvent(id: string, raw: Record<string, unknown>, sourceType: string): UnifiedEvent {
  const now = new Date().toISOString();
  return {
    id,
    timestamp: now,
    sourceType: sourceType as UnifiedEvent['sourceType'],
    title: `Media probe ${id}`,
    description: 'Real-file forensic ingestion probe',
    severity: 'low',
    confidence: 50,
    confidenceBreakdown: {},
    location: { lat: 23.0225, lng: 72.5714 },
    raw,
  } as unknown as UnifiedEvent;
}

function main(): void {
  const file = process.argv[2];
  if (!file || !existsSync(file)) {
    console.error('Usage: npx tsx scripts/media-probe.ts <file> [--source <social_media|audio_recording>] [--corroborated]');
    process.exit(1);
  }
  const sourceIdx = process.argv.indexOf('--source');
  const sourceType = sourceIdx !== -1 ? process.argv[sourceIdx + 1] ?? 'social_media' : 'social_media';
  const corroborated = process.argv.includes('--corroborated');

  const probe = runProbe(file);
  const raw = buildRaw(probe);
  raw['sourceType'] = sourceType;

  const event = buildEvent(`FILE-${Date.now().toString(36).toUpperCase()}`, raw, sourceType);
  let audit = evaluateMediaAuthenticity(event);

  if (corroborated) {
    const nearby = (source: string): UnifiedEvent =>
      buildEvent(`${source}-CORR`, { mediaKind: source === 'audio_recording' ? 'audio' : 'video', noMedia: true }, source);
    refreshAuditCorroboration(audit, event, [nearby('radar'), nearby('incident')]);
  }

  const name = file.split('\\').pop()?.split('/').pop() ?? file;

  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(`  VANGUARD media probe — ${name}`);
  console.log(`══════════════════════════════════════════════════════════`);
  console.log(`  file      : ${file}`);
  console.log(`  kind      : ${raw.mediaKind}   source : ${sourceType}`);
  console.log(`  duration  : ${raw.durationSec}s   bitrate: ${raw.bitrateKbps} kbps   codecs  : ${raw.videoCodec} / ${raw.audioCodec}`);
  console.log(`  resolution: ${raw.resolution}   fps: ${raw.frameRateFps}   samplerate: ${raw.sampleRateHz}Hz`);

  console.log(`\n  Provenance chain (inferred from container tags):`);
  for (const step of raw.reEncodingHistory) console.log(`    • ${step}`);
  if (raw.reEncodingHistory.length === 0) console.log(`    • (none — no re-encode evidence)`);

  console.log(`\n  ┌──────────────────────────┬──────┬─────────────────────────────────────────┐`);
  console.log(`  │ check                     │ score│ findings                               │`);
  console.log(`  ├──────────────────────────┼──────┼─────────────────────────────────────────┤`);
  for (const c of audit.checks) {
    const nameC = c.name.length > 26 ? c.name.slice(0, 24) + '…' : c.name.padEnd(26);
    const scope = c.applicable ? `${String(c.score).padEnd(5)}` : c.score === 100 ? 'n/a ' : 'n/a ';
    const findings = c.applicable ? c.findings.map((f) => f.detail).join('; ') : '— not applicable —';
    console.log(`  │ ${nameC} │ ${scope}│ ${findings.slice(0, 52)}${findings.length > 52 ? '…' : ''}`);
  }
  console.log(`  └──────────────────────────┴──────┴─────────────────────────────────────────┘`);

  console.log(`\n  Provenance score   : ${audit.provenanceScore}/100`);
  console.log(`  Intrinsic content  : ${audit.intrinsicConsistency}/100 (AI-synthetic ${audit.aiSyntheticScore})`);
  console.log(`  Corroboration score: ${audit.corroborationScore}${corroborated ? ' (simulated via --corroborated)' : ''}`);

  console.log(`\n  ┌──────────────────────────────────────────────────────────────────────┐`);
  console.log(`  │  VERDICT  `);
  console.log(`  │    authenticityScore     ${audit.authenticityScore}/100`);
  console.log(`  │    manipulationRisk      ${audit.manipulationRisk}%`);
  console.log(`  │    manipulationCategory  ${audit.manipulationCategory}`);
  console.log(`  │    factualCore           ${audit.factualCoreExtracted.slice(0, 70)}`);
  console.log(`  └──────────────────────────────────────────────────────────────────────┘`);
  console.log('');
}

main();