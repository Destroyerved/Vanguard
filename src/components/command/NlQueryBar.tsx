import React, { useState } from 'react';
import { MessageSquare, Search, Loader2, X, Sparkles } from 'lucide-react';
import { Chip, TacticalButton } from '../ui/tactical';

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

/** Example prompts, so an operator never faces an empty box. */
const SUGGESTIONS = [
  'Critical radar contacts in Sector 3, last 10 minutes',
  'Anomalies corroborated by two or more feeds',
  'Perimeter breaches with confidence above 90%',
];

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
    <div className="vg-panel select-none font-mono">
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-[#a4c639]" />
            <span className="vg-label text-[#a4c639]">Natural-Language Intelligence Query</span>
            <Chip className="!text-[9px]">POST /ai/query</Chip>
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
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#526a27]" />
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
              placeholder="Ask the picture a question…"
              className="vg-input !pl-9 !py-2.5"
            />
          </div>
          <TacticalButton
            variant="primary"
            onClick={() => submit(draft)}
            disabled={pending || !draft.trim()}
            className="!py-2.5"
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Execute</span>
          </TacticalButton>
        </div>

        {/* Starter prompts — only while the operator hasn't asked anything yet */}
        {!draft && !result && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="vg-label">Try</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setDraft(s);
                  submit(s);
                }}
                className="vg-chip vg-chip-btn !text-[9px] normal-case"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="vg-glass-inset p-2.5 text-[11px] leading-relaxed flex items-start gap-2 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span>
                <span className="text-amber-400 font-bold uppercase text-[10px]">
                  Interpretation:{' '}
                </span>
                {result.interpretation}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip>
                Parser
                <b className={result.parser === 'gemini' ? 'text-[#a4c639]' : 'text-emerald-400'}>
                  {result.parser.toUpperCase()}
                </b>
              </Chip>
              <Chip>
                Latency <b className="text-slate-200">{result.latencyMs}ms</b>
              </Chip>
              <Chip active>
                Matched <b>{result.matchedEventIds.length}</b> events — stream narrowed
              </Chip>
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
