import React from 'react';
import { useEventStore } from '../../store/useEventStore';
import type { SeverityLevel, SourceType, UnifiedEvent } from '../../types/vanguard';
import {
  Radio,
  Wind,
  Users,
  FileText,
  AlertTriangle,
  Flame,
  Search,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const SourceFeed: React.FC = () => {
  const events = useEventStore((s) => s.events);
  const selectedEventId = useEventStore((s) => s.selectedEventId);
  const selectEvent = useEventStore((s) => s.selectEvent);
  const openExplainability = useEventStore((s) => s.openExplainability);
  const filters = useEventStore((s) => s.filters);
  const setFilterSourceTypes = useEventStore((s) => s.setFilterSourceTypes);
  const setFilterSeverities = useEventStore((s) => s.setFilterSeverities);

  // Toggle source type filter
  const toggleSourceType = (src: SourceType) => {
    if (filters.sourceTypes.includes(src)) {
      if (filters.sourceTypes.length > 1) {
        setFilterSourceTypes(filters.sourceTypes.filter((s) => s !== src));
      }
    } else {
      setFilterSourceTypes([...filters.sourceTypes, src]);
    }
  };

  // Toggle severity filter
  const toggleSeverity = (sev: SeverityLevel) => {
    if (filters.severities.includes(sev)) {
      if (filters.severities.length > 1) {
        setFilterSeverities(filters.severities.filter((s) => s !== sev));
      }
    } else {
      setFilterSeverities([...filters.severities, sev]);
    }
  };

  // Filtered Events
  const filteredEvents = events.filter((evt) => {
    if (!filters.sourceTypes.includes(evt.sourceType)) return false;
    if (!filters.severities.includes(evt.severity)) return false;
    if (evt.confidence < filters.minConfidence) return false;
    if (filters.showAnomaliesOnly && !evt.isAnomaly) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        evt.title.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        evt.id.toLowerCase().includes(q) ||
        (evt.callsign && evt.callsign.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const getSourceIcon = (src: SourceType) => {
    switch (src) {
      case 'radar':
        return <Radio className="w-3.5 h-3.5 text-cyan-400" />;
      case 'weather':
        return <Wind className="w-3.5 h-3.5 text-sky-400" />;
      case 'personnel':
        return <Users className="w-3.5 h-3.5 text-emerald-400" />;
      case 'log':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'incident':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    }
  };

  const getConfidenceBadge = (conf: number) => {
    if (conf >= 80) return 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300';
    if (conf >= 50) return 'bg-amber-950/80 border-amber-500/60 text-amber-300';
    return 'bg-red-950/80 border-red-500/60 text-red-300';
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-950 text-red-300 border-red-500 font-bold animate-pulse';
      case 'high':
        return 'bg-amber-950 text-amber-300 border-amber-500 font-semibold';
      case 'medium':
        return 'bg-yellow-950 text-yellow-300 border-yellow-500';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050910] border border-cyan-500/30 rounded overflow-hidden tactical-box">
      {/* Feed Header & Filters */}
      <div className="p-2.5 bg-[#09121d] border-b border-cyan-500/30">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center">
            <Radio className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            MULTI-SOURCE INTEL FEED
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {filteredEvents.length} / {events.length} ACTIVE
          </span>
        </div>

        {/* Source Filter Chips */}
        <div className="flex flex-wrap gap-1 mb-1.5">
          {(['radar', 'weather', 'personnel', 'log', 'incident'] as SourceType[]).map((src) => {
            const active = filters.sourceTypes.includes(src);
            return (
              <button
                key={src}
                onClick={() => toggleSourceType(src)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center space-x-1 transition ${
                  active
                    ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-900/60 border border-slate-700/60 text-slate-500 hover:text-slate-400'
                }`}
              >
                {getSourceIcon(src)}
                <span>{src}</span>
              </button>
            );
          })}
        </div>

        {/* Severity Filter Chips */}
        <div className="flex items-center space-x-1">
          <span className="text-[8px] text-slate-400 font-bold mr-1">SEV:</span>
          {(['critical', 'high', 'medium', 'low'] as SeverityLevel[]).map((sev) => {
            const active = filters.severities.includes(sev);
            return (
              <button
                key={sev}
                onClick={() => toggleSeverity(sev)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition ${
                  active
                    ? getSeverityBadge(sev) + ' border'
                    : 'bg-slate-900 border border-slate-700/40 text-slate-500'
                }`}
              >
                {sev.slice(0, 4)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Stream List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No intelligence events match current filter parameters.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isSelected = evt.id === selectedEventId;
            return (
              <div
                key={evt.id}
                onClick={() => selectEvent(evt.id)}
                className={`p-2 rounded border cursor-pointer transition-all relative ${
                  isSelected
                    ? 'bg-[#0e1c2e] border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'bg-[#070e17]/80 hover:bg-[#0a1524] border-cyan-500/20'
                }`}
              >
                {/* Event Top Bar */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    {getSourceIcon(evt.sourceType)}
                    <span className="text-[10px] font-bold text-cyan-300 uppercase font-mono">
                      {evt.id}
                    </span>
                    <span className={`px-1 py-0.2 rounded border text-[8px] uppercase ${getSeverityBadge(evt.severity)}`}>
                      {evt.severity}
                    </span>
                    {evt.isAnomaly && (
                      <span className="px-1 py-0.2 bg-purple-950 border border-purple-500 text-purple-300 rounded text-[8px] font-bold">
                        ANOMALY
                      </span>
                    )}
                  </div>

                  {/* Confidence Badge */}
                  <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${getConfidenceBadge(evt.confidence)}`}>
                    {evt.confidence}% CONF
                  </span>
                </div>

                {/* Title */}
                <div className="text-xs font-bold text-white mb-1 leading-snug font-sans">
                  {evt.title}
                </div>

                {/* Description */}
                <div className="text-[10.5px] text-slate-300 font-sans leading-relaxed line-clamp-2 mb-2">
                  {evt.description}
                </div>

                {/* Footer Telemetry & Corroboration Links */}
                <div className="flex items-center justify-between border-t border-cyan-500/15 pt-1.5 text-[9px] text-slate-400 font-mono">
                  <div className="flex items-center space-x-2">
                    <span>
                      {evt.location.lat.toFixed(2)}°N, {evt.location.lng.toFixed(2)}°E
                    </span>
                    {evt.corroboratedBy.length > 0 && (
                      <span className="text-cyan-400 font-bold">
                        🔗 +{evt.corroboratedBy.length} Feeds
                      </span>
                    )}
                  </div>

                  {/* Explainability trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openExplainability(evt.id);
                    }}
                    className="text-[9px] text-cyan-400 hover:text-cyan-200 underline flex items-center space-x-0.5"
                  >
                    <span>Explain Math</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
