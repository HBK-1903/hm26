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

function releasePlayer(player: HTMLAudioElement) {
  player.onplaying = null;
  player.onwaiting = null;
  player.onpause = null;
  player.onended = null;
  player.onerror = null;
  try { player.pause(); } catch { /* medya API'si olmayabilir */ }
}

/** Tek seferde bir replik; ses yüklenirken veya engellendiğinde yalnız altyazı görünür. */
export function useTransferSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [lastLine, setLastLine] = useState<TransferVoiceLine | null>(null);
  const [speaking, setSpeaking] = useState<TransferSpeaker | null>(null);
  const stop = useCallback(() => {
    const current = audioRef.current;
    audioRef.current = null;
    if (current) releasePlayer(current);
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
      // play() bir yükleme isteğidir; gerçek oynatma ancak "playing" ile başlar.
      // Eski bir kaydın geç gelen olayları yeni konuşmacıyı etkileyemez.
      player.onplaying = () => { if (audioRef.current === player) setSpeaking(line.speaker); };
      const silence = () => { if (audioRef.current === player) setSpeaking(null); };
      const finish = () => {
        if (audioRef.current !== player) return;
        audioRef.current = null;
        releasePlayer(player);
        setSpeaking(null);
      };
      player.onwaiting = silence;
      player.onpause = silence;
      player.onended = finish;
      player.onerror = finish;
      const started = player.play();
      if (started && typeof started.catch === 'function') void started.catch(finish);
    } catch { stop(); }
  }, [muted, stop]);
  const toggle = useCallback(() => {
    stop();
    setMuted((value) => !value);
  }, [stop]);
  const clear = useCallback(() => { stop(); setLastLine(null); }, [stop]);
  useEffect(() => () => {
    const current = audioRef.current;
    audioRef.current = null;
    if (current) releasePlayer(current);
  }, []);
  return { muted, lastLine, speaking, play, toggle, stop, clear };
}
