import { useCallback, useEffect, useRef, useState } from 'react';
import type { TransferSpeaker, TransferVoiceLine } from '../../data/transferVoices';
import { audio } from '../../audio/engine';

/** Etkin ana ses ve efekt tercihlerini kullanır; yeni kalıcı ayar oluşturmaz. */
export function transferVoiceVolume(): number {
  const prefs = audio.getPrefs();
  const master = Number.isFinite(prefs.master) ? prefs.master : 0.8;
  const fx = Number.isFinite(prefs.fx) ? prefs.fx : 0.9;
  return Math.max(0, Math.min(1, master)) * Math.max(0, Math.min(1, fx));
}

/** Tek seferde bir replik; engellenen ses oynatımı metin ve kullanıcı akışını engellemez. */
export function useTransferSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [lastLine, setLastLine] = useState<TransferVoiceLine | null>(null);
  const [speaking, setSpeaking] = useState<TransferSpeaker | null>(null);
  const stop = useCallback(() => {
    const current = audioRef.current;
    audioRef.current = null;
    if (current) {
      current.onended = null;
      current.onerror = null;
      try { current.pause(); } catch { /* medya API'si olmayabilir */ }
    }
    setSpeaking(null);
  }, []);
  const play = useCallback((line: TransferVoiceLine) => {
    stop();
    setLastLine(line);
    if (muted || transferVoiceVolume() <= 0 || typeof window === 'undefined') return;
    try {
      const player = new window.Audio(line.src);
      audioRef.current = player;
      player.volume = transferVoiceVolume();
      const finish = () => {
        if (audioRef.current === player) { audioRef.current = null; setSpeaking(null); }
      };
      player.onended = finish;
      player.onerror = finish;
      setSpeaking(line.speaker);
      const started = player.play();
      if (started && typeof started.catch === 'function') void started.catch(finish);
    } catch { setSpeaking(null); }
  }, [muted, stop]);
  const toggle = useCallback(() => {
    stop();
    setMuted((value) => !value);
  }, [stop]);
  const clear = useCallback(() => { stop(); setLastLine(null); }, [stop]);
  useEffect(() => () => {
    const current = audioRef.current;
    audioRef.current = null;
    if (current) {
      current.onended = null;
      current.onerror = null;
      try { current.pause(); } catch { /* noop */ }
    }
  }, []);
  return { muted, lastLine, speaking, play, toggle, stop, clear };
}
