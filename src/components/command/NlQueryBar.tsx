import React, { useState } from 'react';
import { MessageSquare, Search, Loader2, X, Sparkles } from 'lucide-react';

interface NlQueryResult {
  interpretation: string;
  parser: string;
  latencyMs: number;
  matchedEventIds: string[];
}

interface NlQueryBarProps {
  activeQuery: string;
  result: NlQueryResult | null;
  onRun: (query: string) => void;
  onClear: () => void;
}

/**
 * Phase 5 — natural-language omnibar over POST /ai/query.
 * Translates a plain-English operator request into the fusion engine's filter
 * object and narrows the signal stream to the events it matched (App state).
 */
export default function NlQueryBar({ activeQuery, result, onRun, onClear }: NlQueryBarProps) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || pending) return;
    setPending(true);
    try {
      await onRun(trimmed);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="instrument-panel rounded-sm border border-cyan-500/20 corner-brackets select-none font-mono">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-cyan-400 font-bold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Natural-Language Intelligence Query</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-[9px] text-cyan-300">
              POST /ai/query
            </span>
          </div>
          {activeQuery && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-300 transition-colors"
            >
              <X className="w-3 h-3" />
              CLEAR FILTER
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded bg-[#05070a] border border-white/10 focus-within:border-cyan-500/50 transition-colors">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit(draft);
                if (e.key === 'Escape') {
                  setDraft('');
                  onClear();
                }
              }}
              placeholder={'e.g. "Show critical radar contacts inside Sector 3 from the last 10 minutes"'}
              className="flex-1 bg-transparent outline-none text-xs text-slate-200 placeholder:text-slate-600"
            />
          </div>
          <button
            onClick={() => submit(draft)}
            disabled={pending || !draft.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 text-xs font-bold hover:bg-cyan-900 transition-all disabled:opacity-40 shadow-hud-glow"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">EXECUTE</span>
          </button>
        </div>

        {result && (
          <div className="space-y-1.5">
            <div className="p-2 rounded bg-[#070b10] border border-white/10 text-[11px] leading-relaxed text-slate-300 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span>
                <span className="text-amber-300 font-bold uppercase text-[10px]">Interpretation: </span>
                {result.interpretation}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-slate-400">
                PARSER: <b className={result.parser === 'gemini' ? 'text-cyan-300' : 'text-emerald-300'}>{result.parser.toUpperCase()}</b>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#05070a] border border-white/10 text-slate-400">
                LATENCY: <b className="text-slate-200">{result.latencyMs}ms</b>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                MATCHED <b>{result.matchedEventIds.length}</b> EVENTS — stream narrowed
              </span>
            </div>
          </div>
        )}

        {!result && activeQuery && (
          <div className="text-[10px] text-rose-300">
            Query failed — backend /ai/query unreachable. Stream unchanged.
          </div>
        )}
      </div>
    </div>
  );
}