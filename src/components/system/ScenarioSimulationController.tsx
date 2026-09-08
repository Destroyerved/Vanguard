import React from 'react';
import { Play, AlertTriangle, ShieldAlert, Radio, Activity, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import { DemoScenarioMode } from '../../data/scenarioEngine';

interface ScenarioSimulationControllerProps {
  activeScenario: DemoScenarioMode | null;
  onInjectScenario: (scenario: DemoScenarioMode) => void;
  onClearScenario: () => void;
  onToggleDegradedComms: (enabled: boolean) => void;
  isDegradedComms: boolean;
}

export default function ScenarioSimulationController({
  activeScenario,
  onInjectScenario,
  onClearScenario,
  onToggleDegradedComms,
  isDegradedComms
}: ScenarioSimulationControllerProps) {
  const scenarioList: Array<{
    id: DemoScenarioMode;
    title: string;
    description: string;
    threatTarget: string;
    eventsInjected: number;
    badgeColor: string;
  }> = [
    {
      id: 'COORDINATED_ATTACK',
      title: 'Coordinated Multi-Axis Incursion',
      description: 'Hostile supersonic air incursion combined with ground perimeter tripwire breaches and electronic warfare jamming.',
      threatTarget: 'CRITICAL (280+ PTS)',
      eventsInjected: 6,
      badgeColor: 'border-rose-500/60 bg-rose-950/60 text-rose-300',
    },
    {
      id: 'AIR_COMBAT_INTERCEPT',
      title: 'Air Combat Intercept (QRA Scramble)',
      description: 'Air defence radar tracking non-squawking fast jets near border corridor; patrol squad visual intercept confirmation.',
      threatTarget: 'HIGH SEVERITY',
      eventsInjected: 5,
      badgeColor: 'border-orange-500/60 bg-orange-950/60 text-orange-300',
    },
    {
      id: 'OSINT_AI_VERIFICATION',
      title: 'OSINT Deepfake & Disinformation Surge',
      description: 'Viral social media reports evaluated by AI forensics: PRNU noise floor, synthetic speech detection, and satellite cross-sensor verification.',
      threatTarget: 'HYBRID VERACITY',
      eventsInjected: 4,
      badgeColor: 'border-cyan-500/60 bg-cyan-950/60 text-cyan-300',
    },
    {
      id: 'SEVERE_WEATHER',
      title: 'Severe Meteorological Clutter & Storm Cell',
      description: 'Severe storm cell causing radar signal degradation; tests VANGUARD deduplication and multi-sensor corroboration rejection.',
      threatTarget: 'GUARDED ROUTINE',
      eventsInjected: 4,
      badgeColor: 'border-yellow-500/60 bg-yellow-950/60 text-yellow-300',
    },
    {
      id: 'NORMAL_OPS',
      title: 'Routine Normal Operations Baseline',
      description: 'Nominal surveillance patrols, active squawking flights, and calibrated weather telemetry.',
      threatTarget: 'ROUTINE STABLE',
      eventsInjected: 8,
      badgeColor: 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300',
    },
  ];

  return (
    <div className="instrument-panel rounded-sm p-5 border border-amber-500/30 corner-brackets space-y-4 select-none font-mono text-xs">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-amber-400" />
          <span className="font-heading font-bold text-sm tracking-wider text-amber-300 uppercase">
            OPERATIONAL SCENARIO INJECTION & STRESS SIMULATOR
          </span>
        </div>

        {activeScenario && (
          <button
            onClick={onClearScenario}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#05070a] border border-white/20 hover:border-white/40 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RESET TO LIVE TELEMETRY</span>
          </button>
        )}
      </div>

      {/* ACTIVE STATUS BANNER */}
      <div className="p-3 rounded bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-slate-200">
            {activeScenario ? (
              <span>
                ACTIVE INJECTION: <strong className="text-amber-300">{activeScenario.toUpperCase()}</strong>
              </span>
            ) : (
              'STANDBY: Live operational telemetry stream currently driving Common Operating Picture.'
            )}
          </span>
        </div>
      </div>

      {/* SCENARIO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarioList.map((sc) => {
          const isActive = activeScenario === sc.id;

          return (
            <div
              key={sc.id}
              className={`p-4 rounded border transition-all flex flex-col justify-between space-y-3 ${
                isActive
                  ? 'bg-amber-950/50 border-amber-500 shadow-hud-glow'
                  : 'bg-[#070b10] border-white/10 hover:border-amber-500/40'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${sc.badgeColor}`}>
                    {sc.threatTarget}
                  </span>
                  <span className="text-[10px] text-slate-500">{sc.eventsInjected} Contacts</span>
                </div>
                <div className="font-bold text-slate-100 text-sm">{sc.title}</div>
                <p className="text-slate-400 text-xs leading-relaxed">{sc.description}</p>
              </div>

              <button
                onClick={() => onInjectScenario(sc.id)}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-hud-glow'
                    : 'bg-[#05070a] border border-white/10 text-amber-300 hover:bg-amber-950/40 hover:border-amber-500/50'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isActive ? 'SCENARIO RUNNING' : 'INJECT SCENARIO'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
