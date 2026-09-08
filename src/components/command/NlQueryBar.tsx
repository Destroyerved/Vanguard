import React, { useState } from 'react';
import { MessageSquare, Search, Loader2, X, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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

export default function NlQueryBar({ activeQuery, result, onRun, onClear }: NlQueryBarProps) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const { isDark } = useTheme();

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
    <div
      className={`rounded-sm border corner-brackets select-none font-mono transition-colors ${
        isDark
          ? 'instrument-panel border-[#526a27]/30'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#a4c639] font-bold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Natural-Language Intelligence Query</span>
            <span className="px-1.5 py-0.2 rounded bg-[#16200d] border border-[#526a27]/60 text-[9px] text-[#a4c639]">
              POST /ai/query
            </span>
          </div>
          {activeQuery && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-3 h-3" />
              CLEAR FILTER
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded border focus-within:border-[#526a27] transition-colors ${
              isDark ? 'bg-[#05070a] border-white/10' : 'bg-slate-50 border-slate-300'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
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
              className={`flex-1 bg-transparent outline-none text-xs ${
                isDark ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>
          <button
            onClick={() => submit(draft)}
            disabled={pending || !draft.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#16200d] border border-[#526a27] text-[#a4c639] text-xs font-bold hover:bg-[#33401c] hover:text-white transition-all disabled:opacity-40 shadow-[0_0_12px_rgba(82,106,39,0.3)] cursor-pointer"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">EXECUTE</span>
          </button>
        </div>

        {result && (
          <div className="space-y-1.5">
            <div
              className={`p-2 rounded border text-[11px] leading-relaxed flex items-start gap-2 ${
                isDark
                  ? 'bg-[#070b10] border-white/10 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span>
                <span className="text-amber-400 font-bold uppercase text-[10px]">Interpretation: </span>
                {result.interpretation}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              <span
                className={`px-1.5 py-0.2 rounded border ${
                  isDark ? 'bg-[#05070a] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                PARSER:{' '}
                <b className={result.parser === 'gemini' ? 'text-[#a4c639]' : 'text-emerald-400'}>
                  {result.parser.toUpperCase()}
                </b>
              </span>
              <span
                className={`px-1.5 py-0.2 rounded border ${
                  isDark ? 'bg-[#05070a] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                LATENCY: <b className={isDark ? 'text-slate-200' : 'text-slate-800'}>{result.latencyMs}ms</b>
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#16200d] border border-[#526a27]/60 text-[#a4c639]">
                MATCHED <b>{result.matchedEventIds.length}</b> EVENTS — stream narrowed
              </span>
            </div>
          </div>
        )}

        {!result && activeQuery && (
          <div className="text-[10px] text-rose-400">
            Query failed — backend /ai/query unreachable. Stream unchanged.
          </div>
        )}
      </div>
    </div>
  );
}