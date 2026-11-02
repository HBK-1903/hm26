import { useCallback, useEffect, useRef, useState } from 'react';
import { transferVoiceVolume } from '../transfer/useTransferSpeech';

type Speaker = 'reporter' | 'manager';

/** Optional local device voices only. Dynamic match text is never sent to an online TTS service.
 * Some devices have no Turkish local voice; the full subtitle is always the fallback. */
export function useLocalTurkishSpeech() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState<Speaker | null>(null);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = useCallback(() => {
    if (current.current && typeof window !== 'undefined') window.speechSynthesis?.cancel();
    current.current = null;
    setSpeaking(null);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const engine = window.speechSynthesis;
    const update = () => {
      try { setVoice(engine.getVoices().find((v) => v.localService && /^tr(?:-|$)/i.test(v.lang)) ?? null); }
      catch { setVoice(null); }
    };
    update();
    engine.addEventListener?.('voiceschanged', update);
    return () => {
      engine.removeEventListener?.('voiceschanged', update);
      if (current.current) { current.current = null; engine.cancel(); }
    };
  }, []);
  const play = useCallback((text: string, speaker: Speaker) => {
    stop();
    if (!voice || transferVoiceVolume() <= 0 || typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = voice.lang || 'tr-TR';
      utterance.volume = transferVoiceVolume();
      utterance.onstart = () => { if (current.current === utterance) setSpeaking(speaker); };
      const finish = () => { if (current.current === utterance) { current.current = null; setSpeaking(null); } };
      utterance.onend = finish;
      utterance.onerror = finish;
      current.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch { current.current = null; setSpeaking(null); }
  }, [stop, voice]);
  return { available: !!voice, speaking, play, stop };
}
