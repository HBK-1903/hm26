// HM26 Aşama 4 §15 — Prosedürel ses motoru (WebAudio, dosya yüklemeden üretilir)
// §124: sesler özgün üretilir — dosya paketi yerine sentez (offline-first korunur)

export type SfxKind = 'goal' | 'whistle-start' | 'whistle-end' | 'whistle-half' | 'card' | 'var' | 'save' | 'woodwork' | 'click' | 'celebrate' | 'heartbreak' | 'ui-toggle' | 'nudge';

export interface AudioPrefs {
  master: number;   // 0-1
  crowd: number;    // 0-1
  fx: number;       // 0-1
  music: number;    // 0-1 (ana menü ambient)
}

const DEFAULT_PREFS: AudioPrefs = { master: 0.8, crowd: 0.7, fx: 0.9, music: 0.45 };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdIntensity = 0.25;   // dinamik tribün yoğunluğu (§15.2)
  private crowdTimer: number | null = null;
  private prefs: AudioPrefs = { ...DEFAULT_PREFS };
  private unlocked = false;

  init(prefs?: Partial<AudioPrefs>) {
    this.prefs = { ...DEFAULT_PREFS, ...prefs };
  }

  setPrefs(p: Partial<AudioPrefs>) {
    this.prefs = { ...this.prefs, ...p };
    if (this.masterGain && this.ctx) this.masterGain.gain.setValueAtTime(this.prefs.master, this.ctx.currentTime);
  }

  /** Etkin kanal ayarları: localStorage kullanılamasa da geçerli kullanıcı tercihini döndürür. */
  getPrefs(): AudioPrefs { return { ...this.prefs }; }

  /** iOS unlock: ilk dokunuşta çağrılmalı */
  unlock() {
    if (this.unlocked) return;
    try {
      const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.prefs.master;
      this.masterGain.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.unlocked = true;
    } catch { /* sessiz düş */ }
  }

  private out(gain = 1): GainNode | null {
    if (!this.ctx || !this.masterGain) return null;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.masterGain);
    return g;
  }

  // ——— Tribün (§15.2: skor/dakika/bağlama göre dinamik) ————————————
  startCrowd(derby = false) {
    if (!this.ctx || this.crowdSource) return;
    this.crowdIntensity = derby ? 0.45 : 0.3;
    // Gürültü + bandpass: tribün gürültüsü
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 500; filter.Q.value = 0.6;
    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.value = this.crowdIntensity * this.prefs.crowd * 0.25;
    src.connect(filter); filter.connect(this.crowdGain); this.crowdGain.connect(this.masterGain!);
    src.start();
    this.crowdSource = src;
    this.crowdTimer = window.setInterval(() => {
      if (!this.crowdGain || !this.ctx) return;
      const t = this.crowdIntensity * this.prefs.crowd * 0.22 * (0.85 + Math.random() * 0.3);
      this.crowdGain.gain.linearRampToValueAtTime(t, this.ctx.currentTime + 0.6);
    }, 700);
  }

  stopCrowd() {
    if (this.crowdTimer) { clearInterval(this.crowdTimer); this.crowdTimer = null; }
    try { this.crowdSource?.stop(); } catch { /* noop */ }
    this.crowdSource = null;
    this.crowdIntensity = 0.25;
  }

  /** Tehlikeli atak/şut → tribün yükselir; gol → patlama; sonra sakinleşir */
  pulseCrowd(spike: number) {
    if (!this.ctx || !this.crowdGain) return;
    const t = this.ctx.currentTime;
    const peak = Math.min(1, spike) * this.prefs.crowd * 0.55 + 0.12;
    this.crowdGain.gain.cancelScheduledValues(t);
    this.crowdGain.gain.setValueAtTime(this.crowdGain.gain.value, t);
    this.crowdGain.gain.linearRampToValueAtTime(peak, t + 0.18);
    this.crowdGain.gain.linearRampToValueAtTime(this.crowdIntensity * this.prefs.crowd * 0.24, t + 2.4);
  }

  // ——— Efektler —————————————————————————————————————
  play(kind: SfxKind) {
    if (!this.ctx) return;
    const fx = this.prefs.fx;
    if (fx <= 0) return;
    const t = this.ctx.currentTime;

    switch (kind) {
      case 'goal': {
        const out = this.out(fx * 0.5); if (!out) return;
        const o1 = this.ctx.createOscillator(); o1.type = 'sine'; o1.frequency.setValueAtTime(523, t);
        o1.frequency.linearRampToValueAtTime(784, t + 0.12);
        const g1 = this.ctx.createGain(); g1.gain.setValueAtTime(0.4, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        o1.connect(g1); g1.connect(out); o1.start(t); o1.stop(t + 0.95);
        const o2 = this.ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(1046, t + 0.14);
        const g2 = this.ctx.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.3, t + 0.14); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        o2.connect(g2); g2.connect(out); o2.start(t); o2.stop(t + 0.85);
        this.pulseCrowd(1);
        break;
      }
      case 'whistle-start': case 'whistle-end': case 'whistle-half': {
        const out = this.out(fx * 0.35); if (!out) return;
        const reps = kind === 'whistle-end' ? 3 : kind === 'whistle-half' ? 2 : 1;
        for (let i = 0; i < reps; i++) {
          const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(2400, t + i * 0.35);
          const g = this.ctx.createGain(); g.gain.setValueAtTime(0.14, t + i * 0.35); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.35 + 0.22);
          o.connect(g); g.connect(out); o.start(t + i * 0.35); o.stop(t + i * 0.35 + 0.25);
        }
        break;
      }
      case 'card': {
        const out = this.out(fx * 0.3); if (!out) return;
        const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1800, t); o.frequency.linearRampToValueAtTime(1500, t + 0.18);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.32);
        break;
      }
      case 'var': {
        const out = this.out(fx * 0.25); if (!out) return;
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(660, t);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.55);
        break;
      }
      case 'save': {
        this.pulseCrowd(0.55);
        break;
      }
      case 'woodwork': {
        const out = this.out(fx * 0.38); if (!out) return;
        const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(175, t + 0.22);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.44);
        break;
      }
      case 'celebrate': {  // kupa/sezon başarısı — arpej
        const out = this.out(fx * 0.4); if (!out) return;
        const seq = [523, 659, 784, 1046, 1318];
        seq.forEach((f, i) => {
          const o = this.ctx!.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t + i * 0.11);
          const g = this.ctx!.createGain(); g.gain.setValueAtTime(0.22, t + i * 0.11); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.5);
          o.connect(g); g.connect(out); o.start(t + i * 0.11); o.stop(t + i * 0.11 + 0.55);
        });
        this.pulseCrowd(1);
        break;
      }
      case 'heartbreak': {
        const out = this.out(fx * 0.35); if (!out) return;
        const seq = [392, 349, 311, 261];
        seq.forEach((f, i) => {
          const o = this.ctx!.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f, t + i * 0.16);
          const g = this.ctx!.createGain(); g.gain.setValueAtTime(0.2, t + i * 0.16); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.16 + 0.45);
          o.connect(g); g.connect(out); o.start(t + i * 0.16); o.stop(t + i * 0.16 + 0.5);
        });
        break;
      }
      case 'click': {
        const out = this.out(fx * 0.15); if (!out) return;
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(880, t);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
        break;
      }
      case 'ui-toggle': {
        const out = this.out(fx * 0.18); if (!out) return;
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(660, t); o.frequency.linearRampToValueAtTime(990, t + 0.06);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.13);
        break;
      }
      case 'nudge': {
        const out = this.out(fx * 0.2); if (!out) return;
        const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(440, t); o.frequency.linearRampToValueAtTime(550, t + 0.1);
        const g = this.ctx.createGain(); g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.24);
        break;
      }
    }
  }
}

export const audio = new AudioEngine();
