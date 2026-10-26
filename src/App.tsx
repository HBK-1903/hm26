// HM26 — kök uygulama: açılış / kariyer yuvaları / sihirbaz / oyun kabuğu
import { useState } from 'react';
import { Career, Screen } from './types';
import { GameProvider } from './store/game';
import { AppShell } from './screens/Shell';
import { Splash, CareerSlots } from './screens/Startup';
import { Wizard } from './screens/newcareer/Wizard';
import { SaveBlob, lastActiveSlot, readSave, quickContinueLabel } from './store/persist';
import { warmDb } from './store/persist';
import { applyTheme, loadTheme } from './utils/comfort';
import { useEffect } from 'react';

export default function App() {
  const [phase, setPhase] = useState<'splash' | 'slots' | 'wizard' | 'game'>('splash');
  const [quickContinue, setQuickContinue] = useState<{ slot: number; label: string } | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // FIX P1/2: modül kurulumunda DB ısıtılıyor (kullanıcı "Başla" dediğinde hazır)
  // FIX P1/4: global unhandledrejection kalıcı görünür şerit
  useEffect(() => {
    applyTheme(loadTheme());
    warmDb();
    const onRej = (ev: PromiseRejectionEvent) => {
      console.error('[unhandledrejection]', ev.reason);
      setFatalError('Bir şey ters gitti; kariyerin cihazda güvende. Sayfayı yenileyebilirsin.');
    };
    window.addEventListener('unhandledrejection', onRej);
    // Son aktif yuvayı splash'te çek (hızlı devam için)
    void lastActiveSlot().then(async (slot) => {
      if (!slot) return;
      const r = await readSave(slot).catch(() => null);
      if (r) {
        setQuickContinue({ slot, label: quickContinueLabel(r.meta) });
      }
    });
    return () => window.removeEventListener('unhandledrejection', onRej);
  }, []);
  const [career, setCareer] = useState<Career | null>(null);
  const [snapshot, setSnapshot] = useState<SaveBlob | null>(null);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [wizardSlot, setWizardSlot] = useState(1);

  const startCareer = (c: Career) => {
    setSnapshot(null);
    setCareer(c);
    setPhase('game');
  };

  const continueCareer = (slot: number, blob: SaveBlob) => {
    const c = { ...blob.career, slot };
    setCareer(c);
    setSnapshot(blob);
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
        {phase === 'splash' && (
          <Splash
            quick={quickContinue}
            onQuickContinue={(slot) => { void readSave(slot).then((r) => { if (r) continueCareer(slot, r.blob); else setPhase('slots'); }); }}
            onContinue={() => { setPhase('slots'); }}
          />
        )}
        {phase === 'slots' && (
          <CareerSlots
            onNew={(slot) => { setWizardSlot(slot); setPhase('wizard'); }}
            onContinue={continueCareer}
            onBack={() => setPhase('splash')}
          />
        )}
        {phase === 'wizard' && (
          <Wizard slot={wizardSlot} onDone={startCareer} onBack={() => setPhase('slots')} />
        )}
        {phase === 'game' && career && (
          <GameProvider career={career} snapshot={snapshot}>
            <AppShell pendingScreen={pendingScreen} setPendingScreen={setPendingScreen} />
          </GameProvider>
        )}
      </div>
    </div>
  );
}
