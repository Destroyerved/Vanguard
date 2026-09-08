import React, { useState } from 'react';
import { Search, Sparkles, X, Terminal, Filter } from 'lucide-react';
import { useEventStore } from '../../store/useEventStore';
import { parseNaturalLanguageQuery } from '../../services/aiBriefingService';

export const OmniSearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const setSearchQuery = useEventStore((s) => s.setSearchQuery);
  const setFilterSourceTypes = useEventStore((s) => s.setFilterSourceTypes);
  const setFilterSeverities = useEventStore((s) => s.setFilterSeverities);
  const setMinConfidence = useEventStore((s) => s.setMinConfidence);
  const setShowAnomaliesOnly = useEventStore((s) => s.setShowAnomaliesOnly);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      handleClear();
      return;
    }

    const parsed = parseNaturalLanguageQuery(query);
    setSearchQuery(query);

    if (parsed.sourceType) {
      setFilterSourceTypes([parsed.sourceType]);
    }
    if (parsed.severity) {
      setFilterSeverities([parsed.severity]);
    }
    if (parsed.minConfidence !== undefined) {
      setMinConfidence(parsed.minConfidence);
    }
    if (parsed.hasAnomaly) {
      setShowAnomaliesOnly(true);
    }

    setFeedback(`AI Filter: ${parsed.explanation}`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleClear = () => {
    setQuery('');
    setSearchQuery('');
    setFilterSourceTypes(['radar', 'weather', 'personnel', 'log', 'incident']);
    setFilterSeverities(['low', 'medium', 'high', 'critical']);
    setMinConfidence(0);
    setShowAnomaliesOnly(false);
    setFeedback(null);
  };

  return (
    <div className="relative flex-1 max-w-xl mx-4">
      <form onSubmit={handleSearch} className="relative flex items-center">
        <div className="absolute left-3 text-cyan-400 flex items-center pointer-events-none">
          <Terminal className="w-4 h-4 mr-1 text-cyan-500 opacity-70" />
          <span className="text-[10px] text-cyan-500 font-bold mr-1">C2&gt;</span>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Natural Language Query (e.g. 'high severity radar contacts in sector 7', 'weather anomaly')..."
          className="w-full bg-[#070d15] border border-cyan-500/30 rounded px-3 py-1.5 pl-14 pr-20 text-xs text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-[inset_0_0_10px_rgba(0,240,255,0.05)] transition-all font-mono"
        />

        <div className="absolute right-2 flex items-center space-x-1">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-red-400 text-slate-400 transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="submit"
            className="flex items-center space-x-1 px-2 py-1 bg-cyan-950/80 hover:bg-cyan-800 border border-cyan-500/50 rounded text-[10px] text-cyan-300 font-bold uppercase tracking-wider transition"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Parse</span>
          </button>
        </div>
      </form>

      {feedback && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-[#0c1522] border border-cyan-400/40 rounded px-2.5 py-1 text-[11px] text-cyan-300 shadow-lg flex items-center space-x-1 animate-pulse">
          <Filter className="w-3 h-3 text-cyan-400" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
