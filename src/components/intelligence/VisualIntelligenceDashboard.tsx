import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Cctv,
  ScanEye,
  Video,
  Target,
  AlertTriangle,
  Fingerprint,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle,
  Unlink,
  ShieldAlert,
  Box,
  Activity,
} from 'lucide-react';
import {
  UnifiedEvent,
  VisionSummary,
  VisualManipulationClass,
  VisualClaimStatus,
  ObjectTrack,
} from '../../types/schema';
import {
  StatTile,
  Chip,
  ChipButton,
  ConfidenceMeter,
  EmptyState,
  ScreenHeading,
  severityStyle,
} from '../ui/tactical';

interface VisualIntelligenceDashboardProps {
  events: UnifiedEvent[];
  summary: VisionSummary | null;
  selectedEventId?: string;
  onSelectEvent: (event: UnifiedEvent) => void;
}

/** §14 manipulation classification → operator-facing tone. */
const CLASS_TONE: Record<VisualManipulationClass, string> = {
  AUTHENTIC: 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300',
  EDITED: 'border-white/10 bg-white/5 text-slate-300',
  ENHANCED: 'border-amber-500/50 bg-amber-950/60 text-amber-300',
  SUSPICIOUS_MANIPULATION: 'border-orange-500/50 bg-orange-950/60 text-orange-300',
  POTENTIAL_SYNTHETIC: 'border-rose-500/50 bg-rose-950/60 text-rose-300',
  UNKNOWN: 'border-white/10 bg-white/5 text-slate-400',
};

const CLASS_LABEL: Record<VisualManipulationClass, string> = {
  AUTHENTIC: 'AUTHENTIC',
  EDITED: 'EDITED',
  ENHANCED: 'ENHANCED',
  SUSPICIOUS_MANIPULATION: 'SUSPICIOUS',
  POTENTIAL_SYNTHETIC: 'SYNTHETIC?',
  UNKNOWN: 'UNKNOWN',
};

const CLAIM_STATUS_TEXT: Record<VisualClaimStatus, string> = {
  SUPPORTED: 'text-emerald-300',
  PARTIALLY_SUPPORTED: 'text-amber-300',
  CONTRADICTED: 'text-rose-300',
  UNCERTAIN: 'text-slate-400',
  UNVERIFIABLE: 'text-slate-500',
};

function ClaimStatusIcon({ status }: { status: VisualClaimStatus }) {
  if (status === 'SUPPORTED') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === 'CONTRADICTED') return <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  if (status === 'PARTIALLY_SUPPORTED') return <MinusCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  if (status === 'UNCERTAIN') return <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  return <Unlink className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
}

/** Mini labelled bar for panel tally rows. */
function TallyBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-24 vg-label uppercase truncate">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden min-w-[40px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{ background: tone, boxShadow: `0 0 6px ${tone}` }}
        />
      </div>
      <span className="vg-readout font-bold w-6 text-right">{value}</span>
    </div>
  );
}

function TrackPill({ track }: { track: ObjectTrack }) {
  return (
    <div
      key={track.trackId}
      className={`px-2 py-1 rounded-lg border text-[10px] ${
        track.restrictedEntry
          ? 'border-rose-500/50 bg-rose-950/50 text-rose-300'
          : 'border-[#526a27]/50 bg-white/[0.03] text-slate-300'
      }`}
      title={`${track.trackId} · ${track.framesObserved} frames· ${track.firstSeen} → ${track.lastSeen}`}
    >
      <span className="flex items-center gap-1">
        <span className={`w-1 h-1 rounded-full ${track.status === 'active' ? 'bg-emerald-400 vg-pulse-ring' : 'bg-slate-500'}`} />
        {track.label}
        {track.restrictedEntry && <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 ml-0.5" />}
      </span>
    </div>
  );
}

export default function VisualIntelligenceDashboard({
  events,
  summary,
  selectedEventId,
  onSelectEvent,
}: VisualIntelligenceDashboardProps) {
  const [filterClass, setFilterClass] = useState<'ALL' | VisualManipulationClass>('ALL');
  const [filterManipulated, setFilterManipulated] = useState<boolean | null>(null);

  const clips = useMemo(
    () =>
      events
        .filter((e) => e.sourceType === 'video' && e.visualEvidence)
        .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0)),
    [events]
  );

  const filtered = useMemo(
    () =>
      clips.filter((e) => {
        const fe = e.visualEvidence!.forensics;
        if (filterClass !== 'ALL' && fe.classification !== filterClass) return false;
        if (filterManipulated !== null && e.visualEvidence!.manipulated !== filterManipulated) return false;
        return true;
      }),
    [clips, filterClass, filterManipulated]
  );

  const contradictions = useMemo(
    () =>
      clips.flatMap(
        (e) =>
          (e.visualEvidence!.contradictions ?? []).map((c) => ({
            c,
            event: e,
          }))
      ),
    [clips]
  );

  const cameras = summary?.byCamera ?? [];
  const classification = summary?.classification;
  const claims = summary?.claims;

  const tallyMax = Math.max(
    1,
    ...Object.values(classification ?? {}),
    ...Object.values(claims ?? {})
  );

  return (
    <div className="space-y-4 select-none font-mono text-xs pb-2">
      <ScreenHeading
        eyebrow="Visual Evidence Engine · §24–§33"
        title="Visual Intelligence"
        icon={ScanEye}
        description={
          summary
            ? `${summary.counts.clips} clip(s) across ${summary.counts.cameras} camera post(s), ${summary.counts.activeTracks} identities held in track. Every clip is forensic-read, claim-validated and surfaced — including refuted claims, never silently discarded.`
            : 'CCTV feed parsed by the visual evidence engine — detections, persistent trackers, video forensics and claim validation.'
        }
        actions={
          <div className="flex items-center gap-1.5">
            <ChipButton active={filterManipulated === null} onClick={() => setFilterManipulated(null)}>
              All clips
            </ChipButton>
            <ChipButton active={filterManipulated === true} onClick={() => setFilterManipulated(true)}>
              Manipulated only
            </ChipButton>
            <ChipButton active={filterManipulated === false} onClick={() => setFilterManipulated(false)}>
              Untouched only
            </ChipButton>
          </div>
        }
      />

      {/* COUNTS ROLLUP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile label="Clips Analyzed" value={summary?.counts.clips ?? clips.length} icon={Video} tone="lime" hint="Video events carrying a visual evidence bundle" />
        <StatTile label="Cameras Watched" value={summary?.counts.cameras ?? cameras.length} icon={Cctv} tone="lime" hint="Distinct camera posts in the live picture" />
        <StatTile label="Active Tracks" value={summary?.counts.activeTracks ?? 0} icon={Target} tone="emerald" hint="Persistent object identities held by the tracker" />
        <StatTile label="Surfaced Refutations" value={summary?.counts.contradictions ?? contradictions.length} icon={AlertTriangle} tone={contradictions.length > 0 ? 'rose' : 'slate'} hint="Refuted claims kept visible (§15/§28)" />
      </div>

      {/* FORENSIC MEANS */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatTile
            label="Mean Authenticity"
            value={summary.means.authenticityScore}
            unit="%"
            icon={ShieldAlert}
            tone="slate"
            hint="Weighted §18 authenticity across clips"
          />
          <StatTile
            label="Mean Manipulation Risk"
            value={summary.means.manipulationRisk}
            unit="%"
            icon={Fingerprint}
            tone={summary.means.manipulationRisk > 40 ? 'amber' : 'slate'}
            hint="Aggregated forensic signals, 0–100"
          />
          <StatTile
            label="Tracking Consistency"
            value={Math.round(summary.means.trackingConsistency * 100)}
            unit="%"
            icon={Activity}
            tone="slate"
            hint="Object persistence across frames, 0–1"
          />
          <StatTile
            label="Temporal Confidence"
            value={Math.round(summary.means.temporalConfidence * 100)}
            unit="%"
            icon={Box}
            tone="slate"
            hint="Inter-frame motion coherence, 0–1"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* CLASSIFICATION + CLAIM TALLY */}
        <div className="vg-panel p-4 space-y-2.5">
          <div className="vg-label text-[#a4c639] flex items-center gap-1.5">
            <ScanEye className="w-3.5 h-3.5" /> Clip classification (§14)
          </div>
          {classification ? (
            (Object.keys(CLASS_TONE) as VisualManipulationClass[]).map((cls) => (
              <TallyBar
                key={cls}
                label={CLASS_LABEL[cls]}
                value={classification[cls] ?? 0}
                max={tallyMax}
                tone={cls === 'POTENTIAL_SYNTHETIC' || cls === 'SUSPICIOUS_MANIPULATION' ? '#f43f5e' : cls === 'ENHANCED' || cls === 'EDITED' ? '#f59e0b' : cls === 'AUTHENTIC' ? '#a4c639' : '#64748b'}
              />
            ))
          ) : (
            <EmptyState icon={ScanEye} title="No classification rollup yet" hint="Waiting for the vision engine" />
          )}
        </div>

        <div className="vg-panel p-4 space-y-2.5">
          <div className="vg-label text-[#a4c639] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Claim verdicts
          </div>
          {claims ? (
            (Object.keys(CLAIM_STATUS_TEXT) as VisualClaimStatus[]).map((st) => (
              <TallyBar
                key={st}
                label={st.replace(/_/g, ' ')}
                value={claims[st] ?? 0}
                max={tallyMax}
                tone={
                  st === 'SUPPORTED' ? '#34d399' :
                  st === 'CONTRADICTED' ? '#f43f5e' :
                  st === 'PARTIALLY_SUPPORTED' ? '#f59e0b' : '#64748b'
                }
              />
            ))
          ) : (
            <EmptyState icon={CheckCircle2} title="No claims validated yet" hint="Waiting for the first analyzed clip" />
          )}
        </div>
      </div>

      {/* CAMERA GRID */}
      {cameras.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {cameras.map((cam) => {
            // The rollup already scales manipulationRisk to 0..100
            // (Orchestrator: signals.manipulationRisk * 100); scaling again here
            // rendered a 6% risk as 600%.
            const risk = Math.round(cam.meanManipulationRisk);
            return (
              <div key={cam.cameraId} className="vg-panel p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-100 font-bold text-[11px]">
                    <Cctv className="w-3.5 h-3.5 shrink-0 text-[#a4c639]" />
                    {cam.cameraName}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 vg-label">
                    <Video className="w-3 h-3" /> {cam.clips} clip(s)
                    {cam.restrictedEntries > 0 && (
                      <span className="px-1 rounded bg-rose-950/60 border border-rose-500/45 text-rose-300 text-[9px]">
                        {cam.restrictedEntries} RZ
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <TallyBar label="authenticity" value={Math.round(cam.meanAuthenticity)} max={100} tone="#a4c639" />
                    <TallyBar label="risk" value={risk} max={100} tone={risk > 40 ? '#f43f5e' : '#f59e0b'} />
                    <TallyBar label="tracking" value={Math.round(cam.meanTrackingConsistency * 100)} max={100} tone="#34d399" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLIP FILTER RAIL */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="vg-label mr-0.5">Classification</span>
        {(['ALL', 'AUTHENTIC', 'EDITED', 'ENHANCED', 'SUSPICIOUS_MANIPULATION', 'POTENTIAL_SYNTHETIC', 'UNKNOWN'] as const).map((cls) => (
          <ChipButton
            key={cls}
            active={filterClass === cls}
            onClick={() => setFilterClass(cls)}
            title={cls}
          >
            {cls === 'ALL' ? 'ALL' : CLASS_LABEL[cls]}
          </ChipButton>
        ))}
      </div>

      {/* CLIPS GRID */}
      {clips.length === 0 ? (
        <div className="vg-panel">
          <EmptyState
            icon={Cctv}
            title="No CCTV evidence yet"
            hint="The video feed normalizer will attach visual evidence bundles on the next poll."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((event, idx) => {
            const evidence = event.visualEvidence!;
            const fe = evidence.forensics;
            const sev = severityStyle(event.severity);
            const isSelected = event.id === selectedEventId;
            return (
              <motion.button
                key={event.id}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelectEvent(event)}
                className={`vg-panel p-4 space-y-3 text-left transition-all ${
                  isSelected
                    ? 'vg-panel-interactive !border-[#a4c639]/70 shadow-[0_0_18px_rgba(164,198,57,0.15)]'
                    : 'hover:border-[#526a27]/70'
                }`}
              >
                {/* HEADER */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-100 font-bold leading-snug truncate">
                      {event.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 vg-label">
                      <Cctv className="w-3 h-3 text-[#a4c639]" />
                      {evidence.cameraName}
                      <span className="text-slate-600">·</span>
                      <span>{evidence.evidenceId}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold shrink-0 ${CLASS_TONE[fe.classification]}`}
                  >
                    {CLASS_LABEL[fe.classification]}
                  </span>
                </div>
                {evidence.manipulated && (
                  <div className="px-2 py-1.5 rounded-lg border border-rose-500/50 bg-rose-950/50 text-rose-300 text-[10px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Manipulation signals detected — authenticity {fe.authenticityScore}/100. Kept surfaced, never auto-discarded.
                  </div>
                )}
                {fe.indicators.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {fe.indicators.map((ind) => (
                      <Chip key={ind} tone="neutral" className="!text-slate-400">
                        {ind}
                      </Chip>
                    ))}
                  </div>
                )}

                {/* METRICS */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <div className="vg-label mb-1">Event confidence</div>
                    <ConfidenceMeter value={event.confidence} />
                  </div>
                  <div>
                    <div className="vg-label mb-1">Severity</div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                      <span className={`font-bold ${sev.text}`}>{event.severity.toUpperCase()}</span>
                      <span className="text-slate-500">base {event.baseSeverity || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* CLAIMS */}
                {evidence.claims.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-white/8">
                    <div className="vg-label text-[#a4c639]">Validated claims</div>
                    {evidence.claims.map((claim) => (
                      <div key={claim.id} className="flex items-start gap-1.5 text-[11px]">
                        <ClaimStatusIcon status={claim.status} />
                        <span className="leading-snug">
                          <span className="text-slate-200">{claim.text}</span>{' '}
                          <span className={`font-bold ${CLAIM_STATUS_TEXT[claim.status]}`}>
                            {claim.status.replace(/_/g, ' ')}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CONTRADICTIONS — BOTH SIDES SURFACED */}
                {evidence.contradictions && evidence.contradictions.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-amber-500/20">
                    <div className="vg-label text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> Refuted operator statements (§28)
                    </div>
                    {evidence.contradictions.map((c) => (
                      <div key={c.id} className="px-2 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/25 space-y-1">
                        <div className="flex items-start gap-1.5 text-[11px] text-amber-200">
                          <XCircle className="w-3 h-3 shrink-0 mt-0.5 text-amber-400" />
                          <span className="leading-snug">
                            <span className="text-slate-400">operator:</span> {c.operatorStatement}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-[10px] text-slate-400 pl-[18px] leading-snug">
                          <span className="text-emerald-300 shrink-0">evidence:</span>
                          <span>{c.contradictionBasis.join(' · ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TRACKS */}
                <div className="flex flex-wrap gap-1">
                  {evidence.tracks.slice(0, 6).map((track) => (
                    <TrackPill key={track.trackId} track={track} />
                  ))}
                  {evidence.tracks.length > 6 && (
                    <Chip tone="neutral" className="!text-slate-400">
                      +{evidence.tracks.length - 6} more
                    </Chip>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}