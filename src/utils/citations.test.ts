import { describe, it, expect } from 'vitest';
import { extractCitationIds, stripCitations, renderTextWithCitations } from './citations';

describe('citations util', () => {
  it('extracts every citation token in order', () => {
    const text = 'Radar contact [RADAR-01] corroborated by [INC-42] and [PERIM-04].';
    expect(extractCitationIds(text)).toEqual(['RADAR-01', 'INC-42', 'PERIM-04']);
  });

  it('returns an empty array when no citations exist', () => {
    expect(extractCitationIds('No citations in this prose.')).toEqual([]);
    expect(extractCitationIds('')).toEqual([]);
    expect(extractCitationIds(undefined as unknown as string)).toEqual([]);
  });

  it('strips citation tokens into clean prose for speech synthesis', () => {
    const text = 'Vector UAV recon [RADAR-01] then alert QRF [PERIM-04].';
    const cleaned = stripCitations(text);
    expect(cleaned).not.toContain('[');
    expect(cleaned).not.toContain(']');
    expect(cleaned).toBe('Vector UAV recon RADAR-01 then alert QRF PERIM-04.');
  });

  it('does not double-space prose when tokens are stripped', () => {
    const cleaned = stripCitations('A [X-1] B');
    expect(cleaned).toBe('A X-1 B');
  });

  it('renders citations as clickable button elements', () => {
    const node = renderTextWithCitations('Contact [RADAR-01] confirmed.', (id) => id);
    expect(Array.isArray(node)).toBe(true);
    const buttons = (node as Array<{ type: unknown }>).filter((child) => child?.type === 'button');
    expect(buttons.length).toBe(1);
  });

  it('renders plain text with no buttons when un-cited', () => {
    const node = renderTextWithCitations('Just prose.');
    const buttons = (Array.isArray(node) ? node : [node]).filter((child) => child?.type === 'button');
    expect(buttons.length).toBe(0);
  });
});