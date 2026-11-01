// HM26 — kök uygulama: açılış / kariyer yuvaları / sihirbaz / oyun kabuğu
import { useCallback, useEffect, useState } from 'react';
import { Career, Screen } from './types';
import { GameProvider, useGame } from './store/game';
import { AppShell } from './screens/Shell';
import { Splash, CareerSlots } from './screens/Startup';
import { Wizard } from './screens/newcareer/Wizard';
import { SaveBlob, lastActiveSlot, readSave, quickContinueLabel } from './store/persist';
import { warmDb } from './store/persist';
import { applyTheme, loadTheme } from './utils/comfort';
import { useServiceWorker } from './hooks/useServiceWorker';

function UpdateNotice({ onApply, onDismiss, busy = false, error = false }: { onApply: () => void; onDismiss: () => void; busy?: boolean; error?: boolean }) {
  return (
    <section role="region" aria-label="Uygulama güncellemesi" aria-live="polite"
      className="absolute inset-x-3 z-[95] flex items-center gap-2 rounded-xl border p-3 shadow-xl"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)', background: 'var(--c-surface)', borderColor: 'var(--c-line)', color: 'var(--c-primary)' }}>
      <span className="flex-1 text-xs font-semibold">{error ? 'Kariyer kaydedilemedi; güncelleme yapılmadı.' : 'Yeni sürüm hazır, güncellemek için tıklayın.'}</span>
      <button type="button" disabled={busy} onClick={onApply} className="min-h-touch rounded-lg bg-primary px-3 py-2 text-xs font-black text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">{busy ? 'Kaydediliyor…' : 'Güncelle'}</button>
      <button type="button" disabled={busy} onClick={onDismiss} aria-label="Güncellemeyi daha sonra yap" className="min-h-touch min-w-touch rounded-lg px-2 text-sm font-bold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Sonra</button>
    </section>
  );
}

function GameUpdateNotice({ applyUpdate, dismissUpdate }: { applyUpdate: () => void; dismissUpdate: () => void }) {
  const game = useGame();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const update = async () => {
    if (busy || !window.confirm('Güncelleme oyunu yeniden açar. Kariyer ve devam eden maç kaydedilir; maç son güvenli noktasından açılabilir. Son değişiklikler veya sürüm uyumsuzluğu için önce yedek alman önerilir. Devam edilsin mi?')) return;
    setBusy(true);
    const saved = await game.saveNow(true);
    setBusy(false);
    if (saved) applyUpdate();
    else setFailed(true);
  };
  return <UpdateNotice onApply={() => { void update(); }} onDismiss={dismissUpdate} busy={busy} error={failed} />;
}

export default function App() {
  const { updateReady, applyUpdate, dismissUpdate } = useServiceWorker();
  const [phase, setPhase] = useState<'splash' | 'slots' | 'wizard' | 'game'>('splash');
  const [quickContinue, setQuickContinue] = useState<{ slot: number; label: string } | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  const refreshQuickContinue = useCallback(async () => {
    try {
      const slot = await lastActiveSlot();
      const record = slot ? await readSave(slot) : null;
      setQuickContinue(record && slot ? { slot, label: quickContinueLabel(record.meta) } : null);
      setStartupError(null);
    } catch (error) {
      setQuickContinue(null);
      setStartupError(error instanceof Error && error.message ? `Son kariyer okunamadı: ${error.message}` : 'Son kariyer okunamadı. Kayıt yuvalarını açıp tekrar dene.');
    }
  }, []);
  const quickOpen = async (slot: number) => {
    try {
      const record = await readSave(slot);
      if (record) continueCareer(slot, record.blob, Number.isFinite(record.meta.updatedAt) ? record.meta.updatedAt : undefined);
      else { setQuickContinue(null); setPhase('slots'); }
    } catch (error) {
      setStartupError(error instanceof Error && error.message ? `Kariyer açılamadı: ${error.message}` : 'Kariyer okunamadı. Tekrar dene.');
    }
  };

  // FIX P1/2: modül kurulumunda DB ısıtılıyor (kullanıcı "Başla" dediğinde hazır)
  // FIX P1/4: global unhandledrejection kalıcı görünür şerit
  useEffect(() => {
    applyTheme(loadTheme());
    warmDb();
    const onRej = (ev: PromiseRejectionEvent) => {
      console.error('[unhandledrejection]', ev.reason);
      setFatalError('Bir şey ters gitti; son değişiklikler kaydedilmemiş olabilir. Yenilemeden önce kayıt durumunu kontrol et.');
    };
    window.addEventListener('unhandledrejection', onRej);
    // Son aktif yuvayı splash'te çek (hızlı devam için)
    void refreshQuickContinue();
    return () => window.removeEventListener('unhandledrejection', onRej);
  }, [refreshQuickContinue]);
  const [career, setCareer] = useState<Career | null>(null);
  const [snapshot, setSnapshot] = useState<SaveBlob | null>(null);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<number | undefined>(undefined);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [wizardSlot, setWizardSlot] = useState(1);

  const startCareer = (c: Career) => {
    setSnapshot(null);
    setSnapshotUpdatedAt(undefined);
    setCareer(c);
    setPhase('game');
  };

  const continueCareer = (slot: number, blob: SaveBlob, updatedAt?: number) => {
    const c = { ...blob.career, slot };
    setCareer(c);
    setSnapshot(blob);
    setSnapshotUpdatedAt(updatedAt);
    setPhase('game');
  };

  return (
    <div className="h-full m26-bg">
      <div className="h-full w-full max-w-[430px] mx-auto relative overflow-hidden">
        {fatalError && (
          <div role="alert" className="absolute top-0 inset-x-0 z-[90] bg-amber text-base text-[12.5px] font-bold px-3 py-2 flex items-center justify-between" style={{ color: '#0B0B0E' }}>
            <span>{fatalError}</span>
            <button onClick={() => setFatalError(null)} className="ml-2 underline">Kapat</button>
          </div>
        )}
        {startupError && phase === 'splash' && (
          <div role="alert" className="absolute top-0 inset-x-0 z-[90] bg-amber text-base text-[12.5px] font-bold px-3 py-2 flex items-center justify-between" style={{ color: '#0B0B0E' }}>
            <span>{startupError}</span>
            <button onClick={() => { void refreshQuickContinue(); }} className="ml-2 underline">Tekrar Dene</button>
          </div>
        )}
        {updateReady && phase !== 'game' && <UpdateNotice onApply={applyUpdate} onDismiss={dismissUpdate} />}
        {phase === 'splash' && (
          <Splash
            quick={quickContinue}
            onQuickContinue={(slot) => { void quickOpen(slot); }}
            onContinue={() => { setPhase('slots'); }}
          />
        )}
        {phase === 'slots' && (
          <CareerSlots
            onNew={(slot) => { setWizardSlot(slot); setPhase('wizard'); }}
            onContinue={continueCareer}
            onBack={() => { setPhase('splash'); void refreshQuickContinue(); }}
          />
        )}
        {phase === 'wizard' && (
          <Wizard slot={wizardSlot} onDone={startCareer} onBack={() => setPhase('slots')} />
        )}
        {phase === 'game' && career && (
          <GameProvider career={career} snapshot={snapshot} initialUpdatedAt={snapshotUpdatedAt}>
            <AppShell pendingScreen={pendingScreen} setPendingScreen={setPendingScreen} />
            {updateReady && <GameUpdateNotice applyUpdate={applyUpdate} dismissUpdate={dismissUpdate} />}
          </GameProvider>
        )}
      </div>
    </div>
  );
}
