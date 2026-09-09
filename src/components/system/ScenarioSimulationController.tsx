import React from 'react';
import { motion } from 'motion/react';
import { Play, AlertTriangle, RefreshCw, WifiOff, Activity, CheckCircle2 } from 'lucide-react';
import { DemoScenarioMode } from '../../data/scenarioEngine';
import { ScreenHeading, Chip, TacticalButton, TacticalPanel } from '../ui/tactical';

interface ScenarioSimulationControllerProps {
  activeScenario: DemoScenarioMode | null;
  onInjectScenario: (scenario: DemoScenarioMode) => void;
  onClearScenario: () => void;
  onToggleDegradedComms: (enabled: boolean) => void;
  isDegradedComms: boolean;
}

const SCENARIOS: Array<{
  id: DemoScenarioMode;
  title: string;
  description: string;
  threatTarget: string;
  eventsInjected: number;
  accent: string;
  badge: string;
}> = [
  {
    id: 'COORDINATED_ATTACK',
    title: 'Coordinated Multi-Axis Incursion',
    description:
      'Hostile supersonic air incursion combined with ground perimeter tripwire breaches and electronic warfare jamming.',
    threatTarget: 'Critical (280+ pts)',
    eventsInjected: 6,
    accent: '#f43f5e',
    badge: 'border-rose-500/60 bg-rose-950/60 text-rose-300',
  },
  {
    id: 'AIR_COMBAT_INTERCEPT',
    title: 'Air Combat Intercept (QRA Scramble)',
    description:
      'Air defence radar tracking non-squawking fast jets near the border corridor; patrol squad visual intercept confirmation.',
    threatTarget: 'High severity',
    eventsInjected: 5,
    accent: '#f97316',
    badge: 'border-orange-500/60 bg-orange-950/60 text-orange-300',
  },
  {
    id: 'OSINT_AI_VERIFICATION',
    title: 'OSINT Deepfake & Disinformation Surge',
    description:
      'Viral social posts run through AI forensics: PRNU noise floor, synthetic speech detection, and satellite cross-sensor verification.',
    threatTarget: 'Hybrid veracity',
    eventsInjected: 4,
    accent: '#a4c639',
    badge: 'border-[#526a27]/70 bg-[#a4c639]/12 text-[#bcd94f]',
  },
  {
    id: 'SEVERE_WEATHER',
    title: 'Severe Meteorological Clutter',
    description:
      'Storm cell degrading radar returns; exercises deduplication and multi-sensor corroboration rejection.',
    threatTarget: 'Guarded routine',
    eventsInjected: 4,
    accent: '#eab308',
    badge: 'border-yellow-500/60 bg-yellow-950/60 text-yellow-300',
  },
  {
    id: 'NORMAL_OPS',
    title: 'Routine Operations Baseline',
    description:
      'Nominal surveillance patrols, active squawking flights, and calibrated weather telemetry.',
    threatTarget: 'Routine stable',
    eventsInjected: 8,
    accent: '#34d399',
    badge: 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300',
  },
];

export default function ScenarioSimulationController({
  activeScenario,
  onInjectScenario,
  onClearScenario,
  onToggleDegradedComms,
  isDegradedComms,
}: ScenarioSimulationControllerProps) {
  return (
    <div className="space-y-4 select-none font-mono text-xs pb-2">
      <ScreenHeading
        eyebrow="Stress Simulator"
        title="Operational Scenario Injection"
        icon={Play}
        description="Replace the live picture with a scripted incident to exercise fusion, correlation and the grounding gate end to end."
        actions={
          <div className="flex items-center gap-2">
            <TacticalButton
              onClick={() => onToggleDegradedComms(!isDegradedComms)}
              variant={isDegradedComms ? 'danger' : 'default'}
              icon={isDegradedComms ? WifiOff : Activity}
            >
              {isDegradedComms ? 'Comms Degraded' : 'Degrade Comms'}
            </TacticalButton>
            {activeScenario && (
              <TacticalButton onClick={onClearScenario} icon={RefreshCw}>
                Reset to Live
              </TacticalButton>
            )}
          </div>
        }
      />

      {/* ACTIVE STATUS BANNER */}
      <div
        className={`vg-panel p-3.5 flex items-center gap-3 ${
          activeScenario ? 'vg-panel-glow !border-amber-500/50' : ''
        }`}
      >
        {activeScenario ? (
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-[#a4c639] shrink-0" />
        )}
        <span className="text-slate-300 font-sans text-[12px]">
          {activeScenario ? (
            <>
              Scripted injection driving the COP:{' '}
              <strong className="text-amber-300 font-mono">
                {activeScenario.replace(/_/g, ' ')}
              </strong>
              . Live telemetry is suspended until you reset.
            </>
          ) : (
            'Standby — live operational telemetry is driving the Common Operating Picture.'
          )}
        </span>
      </div>

      {/* SCENARIO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {SCENARIOS.map((sc, idx) => {
          const isActive = activeScenario === sc.id;

          return (
            <motion.div
              key={sc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`vg-panel vg-panel-interactive p-4 pl-6 flex flex-col justify-between gap-3 relative ${
                isActive ? 'vg-panel-glow' : ''
              }`}
              style={isActive ? { borderColor: `${sc.accent}99` } : undefined}
            >
              {/* Scenario accent spine */}
              <span
                className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r"
                style={{
                  background: sc.accent,
                  opacity: isActive ? 1 : 0.4,
                  boxShadow: isActive ? `0 0 12px ${sc.accent}` : 'none',
                }}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold border tracking-wider ${sc.badge}`}
                  >
                    {sc.threatTarget}
                  </span>
                  <span className="vg-label">{sc.eventsInjected} contacts</span>
                </div>
                <div className="vg-title text-[13px] text-slate-100 leading-snug">{sc.title}</div>
                <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
                  {sc.description}
                </p>
              </div>

              <TacticalButton
                onClick={() => onInjectScenario(sc.id)}
                variant={isActive ? 'primary' : 'default'}
                icon={Play}
                className="w-full"
              >
                {isActive ? 'Scenario Running' : 'Inject Scenario'}
              </TacticalButton>
            </motion.div>
          );
        })}
      </div>

      <TacticalPanel title="What Injection Exercises" icon={Activity} brackets={false}>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-400 font-sans">
          <li className="vg-glass-inset p-3">
            <span className="vg-label block mb-1 text-[#a4c639]">Correlation</span>
            Injected events run through the same Union-Find clustering as live feeds — ΔR ≤ 2.1 km,
            ΔT ≤ 18 s.
          </li>
          <li className="vg-glass-inset p-3">
            <span className="vg-label block mb-1 text-[#a4c639]">Confidence</span>
            Scores are recomputed from source reliability, freshness and corroboration; nothing is
            hard-coded.
          </li>
          <li className="vg-glass-inset p-3">
            <span className="vg-label block mb-1 text-[#a4c639]">Grounding</span>
            Every briefing claim is still checked against raw events before it reaches the operator.
          </li>
        </ul>
      </TacticalPanel>
    </div>
  );
}
