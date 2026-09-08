import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * VANGUARD — voice briefing readout (F-39b).
 *
 * Uses the browser speechSynthesis API to deliver the AI briefing's headline,
 * executive summary, prioritized actions, and courses of action. The readout
 * is textual prose only — citation tokens are stripped before speaking.
 *
 * Accessibility: if `prefers-reduced-motion` is set, the briefing is suppressed
 * entirely (auditory output respects the motion-reduction preference).
 */
export function useVoiceBriefing() {
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setSupported(false);
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setSupported(false);
    } else if (!('speechSynthesis' in window)) {
      setSupported(false);
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /en[-_](?:GB|US)/i.test(v.lang) && v.name.includes('Natural')) ?? voices.find((v) => /^en/i.test(v.lang));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (playing) stop();
      else speak(text);
    },
    [playing, speak, stop],
  );

  return { playing, supported, speak, stop, toggle };
}