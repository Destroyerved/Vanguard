/**
 * VANGUARD — citation utilities for AI-produced briefing text.
 *
 * Server-grounded prose embeds `[EVT-101]`-style tokens that reference events
 * that survived grounding. These render as clickable chips in mission cards
 * and are stripped before speech synthesis.
 */

import React from 'react';

const CITATION_RE = /\[([A-Za-z0-9\-_]+)\]/g;

/** Extract the event IDs referenced by citation tokens, in order. */
export function extractCitationIds(text: string): string[] {
  if (!text) return [];
  const ids: string[] = [];
  for (const match of text.matchAll(CITATION_RE)) ids.push(match[1]);
  return ids;
}

/** Remove citation tokens, returning clean prose for voice readout. */
export function stripCitations(text: string): string {
  if (!text) return '';
  return text
    .replace(CITATION_RE, ' $1 ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

export function renderTextWithCitations(
  text: string,
  onSelectEventId?: (eventId: string) => void,
): React.ReactNode {
  if (!text) return null;
  const parts = text.split(CITATION_RE);
  const tokens = extractCitationIds(text);

  return parts.map((part, idx) => {
    const token = tokens[idx - 1];
    if (idx > 0 && token !== undefined) {
      return (
        <button
          key={idx}
          onClick={() => onSelectEventId && onSelectEventId(token)}
          className="inline-flex items-center gap-0.5 px-1.5 py-[1px] mx-0.5 rounded-lg bg-[#a4c639]/10 backdrop-blur-md border border-[#526a27]/40 text-[#bcd94f] hover:text-[#e8f7c0] hover:bg-[#a4c639]/20 font-mono text-[11px] font-bold transition-all shadow-sm"
          title={`Inspect Grounded Event ${token}`}
        >
          [{token}]
        </button>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}