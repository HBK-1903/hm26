// HM26 FIX P0/3 — Route-seviye hata sınırı: bir ekran çökerse uygulama yaşar
import React from 'react';

interface Props { children: React.ReactNode; screenName?: string; onBackToHub?: () => void }
interface State { err: Error | null }

export class ScreenBoundary extends React.Component<Props, State> {
  state: State = { err: null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    // Geliştirici konsolu + gelecek doktor ekranına satır
    console.error('[screen-crash]', this.props.screenName ?? '?', err, info);
    try {
      const log = JSON.parse(localStorage.getItem('m26_crashlog') ?? '[]');
      log.push({ at: Date.now(), screen: this.props.screenName ?? '?', msg: err.message.slice(0, 200) });
      localStorage.setItem('m26_crashlog', JSON.stringify(log.slice(-20)));
    } catch { /* noop */ }
  }
  render() {
    if (this.state.err) {
      return (
        <div role="alert" className="h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-primary font-bold text-[14px]">Bu bölüm beklenmedik bir hataya uğradı.</p>
          <p className="text-secondary text-[12px] mt-1">{(this.state.err as Error).message?.slice(0, 80)}</p>
          <button
            onClick={() => { this.setState({ err: null }); this.props.onBackToHub?.(); }}
            className="mt-4 min-h-touch px-4 rounded-xl bg-amber text-base font-bold text-[13px]"
          >
            ← Ana Merkez'e dön
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
