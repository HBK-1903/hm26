// HM26 — PWA kurulum daveti + sürüm notu (Dalga 7)
// beforeinstallprompt yakala → Hub'da sakin bant; iOS için paylaşım-ipucu sayfası.
import React, { useEffect, useState } from 'react';
import { Sheet, Btn } from './kit';
import { APP_VERSION, unseenChangelog, markChangelogSeen } from '../../version';

// ── Kurulum daveti ──
export const InstallBanner: React.FC = () => {
  const [evt, setEvt] = useState<any>(null);
  const [iosHelp, setIosHelp] = useState(false);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('m26-install-dismissed') === '1'; } catch { return false; } });
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (hidden) return null;
  const isIos = /iP(hone|ad|od)/.test(navigator.userAgent) && !(window as any).MSStream;
  const installed = window.matchMedia?.('(display-mode: standalone)')?.matches || (navigator as any).standalone;
  if (installed || (!evt && !isIos)) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem('m26-install-dismissed', '1'); } catch {} };
  return (
    <>
      <div className="m26-in bg-info/10 border border-info/40 rounded-card px-3.5 py-2.5 flex items-center gap-2.5 text-[12.5px]">
        <span className="text-lg">📲</span>
        <span className="text-primary/95 flex-1 leading-snug">Ana ekrana ekle — maç günü bildirimi gibi oynarsın; tam ekran akıcı açılır.</span>
        <Btn variant="secondary" className="!min-h-[36px] !px-2.5 !text-[11.5px]" onClick={async () => {
          if (evt) { evt.prompt().catch(() => {}); setEvt(null); dismiss(); }
          else setIosHelp(true);
        }}>Kur</Btn>
        <button onClick={dismiss} className="min-w-[36px] min-h-[36px] text-muted text-lg" aria-label="Kapat">✕</button>
      </div>
      <Sheet open={iosHelp} onClose={() => { setIosHelp(false); dismiss(); }} title="Ana ekrana nasıl eklenir?">
        <div className="space-y-2.5 text-[13px] text-primary/95 leading-snug">
          <p>1. Tarayıcında <b>Paylaş</b> (□↑) düğmesine dokun.</p>
          <p>2. Listeden <b>"Ana Ekrana Ekle"</b>'yi seç.</p>
          <p>3. HM26 simgesi ana ekranında — tam ekran uygulama gibi açılır, internet yokken bile kayıtlarına erişirsin.</p>
          <Btn variant="amber" className="w-full" onClick={() => { setIosHelp(false); dismiss(); }}>Tamam</Btn>
        </div>
      </Sheet>
    </>
  );
};

// ── Sürüm notu (güncelleme sonrası ilk açılış) ──
export const VersionNote: React.FC = () => {
  const [lines, setLines] = useState<string[]>(() => unseenChangelog());
  if (!lines.length) return null;
  return (
    <Sheet open onClose={() => { markChangelogSeen(); setLines([]); }} title={`Sürüm ${APP_VERSION} — Yenilikler`}>
      <div className="space-y-2 text-[13px] text-primary/95 leading-snug">
        {lines.slice(1).map((l, i) => <p key={i}>{l}</p>)}
        <p className="text-muted text-[11.5px]">Tam değişiklik günlüğü oyun içi QA-REPORT ekosisteminde korunur.</p>
        <Btn variant="amber" className="w-full" onClick={() => { markChangelogSeen(); setLines([]); }}>Anladım</Btn>
      </div>
    </Sheet>
  );
};
