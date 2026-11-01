// HM26 — UI/UX §3.3 bileşen kiti (kart/rozet/buton/bottom-sheet/segment)
import React from 'react';

// One stack covers sheets and full-screen profiles. A nested dialog alone owns
// Escape, Tab and focus; closing it returns focus to its opener in the parent.
interface FocusLayer { root: HTMLElement; previous: HTMLElement | null }
const focusLayers: FocusLayer[] = [];
let pendingFocus: HTMLElement | null = null;
let bodyLocks = 0;
let originalBodyOverflow = '';

export function useFocusTrap<T extends HTMLElement>(active: boolean, options: { onEscape?: () => void; lockBody?: boolean } = {}): React.RefObject<T> {
  const ref = React.useRef<T>(null);
  const optionsRef = React.useRef(options);
  optionsRef.current = options;
  React.useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const layer: FocusLayer = { root, previous: current && current !== document.body && current.isConnected ? current : pendingFocus };
    pendingFocus = null;
    focusLayers.push(layer);
    const locked = !!optionsRef.current.lockBody;
    if (locked) {
      if (bodyLocks++ === 0) { originalBodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    }
    const topmost = () => focusLayers[focusLayers.length - 1] === layer;
    const qs = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(qs)).filter((node) => node.offsetParent !== null || node === document.activeElement);
    const focusFirst = () => (items()[0] ?? root).focus();
    const onKey = (event: KeyboardEvent) => {
      if (!topmost()) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        optionsRef.current.onEscape?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = items();
      if (!list.length) { event.preventDefault(); root.focus(); return; }
      const first = list[0], last = list[list.length - 1];
      const cur = document.activeElement as HTMLElement | null;
      const outside = !cur || !root.contains(cur);
      if (event.shiftKey ? (outside || cur === first) : (outside || cur === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (topmost() && event.target && !root.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    // Focus the dialog immediately, then let React finish rendering its controls.
    if (!root.contains(document.activeElement)) root.focus();
    const timer = window.setTimeout(() => {
      if (topmost() && (!root.contains(document.activeElement) || document.activeElement === root)) focusFirst();
    }, 70);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
      const index = focusLayers.indexOf(layer);
      const wasTop = topmost();
      const next = focusLayers[index + 1];
      // If parent and child close together, preserve the parent's original opener.
      if (next?.previous && root.contains(next.previous)) next.previous = layer.previous;
      if (index !== -1) focusLayers.splice(index, 1);
      if (locked && --bodyLocks === 0) document.body.style.overflow = originalBodyOverflow;
      if (wasTop && layer.previous?.isConnected) {
        const previous = layer.previous;
        pendingFocus = previous;
        window.setTimeout(() => {
          if (pendingFocus === previous) pendingFocus = null;
          const top = focusLayers[focusLayers.length - 1];
          // A replacement dialog may have opened in the same React commit.
          if (previous.isConnected && (!top || top.root.contains(previous))) previous.focus();
        }, 0);
      }
    };
  }, [active]);
  return ref;
}

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; accent?: string }> = ({ children, className = '', onClick, accent }) => (
  <div
    onClick={onClick}
    onKeyDown={onClick ? (event) => {
      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault(); onClick();
    } : undefined}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    className={`bg-surface rounded-card p-4 border border-line/60 ${onClick ? 'active:scale-[0.985] transition-transform cursor-pointer' : ''} ${className}`}
    style={accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
  >
    {children}
  </div>
);

export const Btn: React.FC<{ children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'amber'; className?: string; disabled?: boolean; clubColor?: string; testId?: string }> = ({ children, onClick, variant = 'primary', className = '', disabled, clubColor, testId }) => {
  const base = 'min-h-touch px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-50 disabled:pointer-events-none select-none';
  const styles: Record<string, React.CSSProperties> = {
    primary: clubColor ? { background: clubColor, color: readableText(clubColor) } : { background: 'var(--c-accent)', color: 'var(--c-on-accent)' },
    amber: { background: 'var(--c-accent)', color: 'var(--c-on-accent)' },
    secondary: { background: 'var(--c-elevated)', color: 'var(--c-primary)', border: '1px solid var(--c-line)' },
    danger: { background: 'var(--c-danger)', color: 'var(--c-base)' },
  };
  return <button type="button" onClick={onClick} disabled={disabled} data-testid={testId} className={`${base} ${className}`} style={styles[variant]}>{children}</button>;
};

function readableText(hex: string): string {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#7C4D2E';
  const luminance = (value: string) => {
    const channels = [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const bg = luminance(normalized), light = luminance('#FAF5EA'), dark = luminance('#1D2B23');
  const lightContrast = (Math.max(bg, light) + 0.05) / (Math.min(bg, light) + 0.05);
  const darkContrast = (Math.max(bg, dark) + 0.05) / (Math.min(bg, dark) + 0.05);
  return lightContrast >= darkContrast ? '#FAF5EA' : '#1D2B23';
}

export const Badge: React.FC<{ kind: 'ok' | 'warn' | 'danger' | 'info' | 'special' | 'muted'; children: React.ReactNode; className?: string }> = ({ kind, children, className = '' }) => {
  const map = {
    ok: 'bg-ok/15 text-ok border-ok/40',
    warn: 'bg-warn/15 text-warn border-warn/40',
    danger: 'bg-danger/15 text-danger border-danger/40',
    info: 'bg-info/15 text-info border-info/40',
    special: 'bg-special/15 text-special border-special/40',
    muted: 'bg-muted/15 text-secondary border-line',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold font-body ${map[kind]} ${className}`}>{children}</span>;
};

export const Sheet: React.FC<{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode; tall?: boolean; dismissible?: boolean }> = ({ open, onClose, title, children, tall = false, dismissible = true }) => {
  const trapRef = useFocusTrap<HTMLDivElement>(open, { lockBody: true, onEscape: dismissible ? onClose : undefined });
  const titleId = React.useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : 'Açılır panel'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={dismissible ? onClose : undefined} aria-hidden="true" />
      <div ref={trapRef} tabIndex={-1} className={`absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-elevated rounded-t-3xl border-t border-line ${tall ? 'max-h-[93dvh]' : 'max-h-[82dvh]'} flex flex-col m26-in`}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="w-10 h-1.5 rounded-full bg-line mx-auto absolute left-1/2 -translate-x-1/2 top-2" aria-hidden="true" />
          {title && <h2 id={titleId} className="font-display text-[17px] text-primary mt-2">{title}</h2>}
          {dismissible && <button type="button" onClick={onClose} className="min-w-touch min-h-touch -mr-2 flex items-center justify-center text-secondary text-xl ml-auto" aria-label="Kapat">×</button>}
        </div>
        <div className="overflow-y-auto no-scrollbar px-5 pb-8 safe-b">{children}</div>
      </div>
    </div>
  );
};

export const Seg: React.FC<{ options: { v: string; label: string }[]; value: string; onChange: (v: string) => void; className?: string; ariaLabel?: string }> = ({ options, value, onChange, className = '', ariaLabel }) => (
  <div className={`flex bg-base rounded-xl p-1 gap-1 ${className}`} role="group" aria-label={ariaLabel ?? 'Seçenekler'}>
    {options.map((o) => (
      <button
        type="button"
        key={o.v}
        onClick={() => onChange(o.v)}
        aria-pressed={value === o.v}
        className={`flex-1 min-h-touch rounded-lg text-[12px] font-bold transition-colors ${value === o.v ? 'bg-elevated text-amber shadow-inner' : 'text-secondary'}`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const StatBar: React.FC<{ value: number; max?: number; color?: string; className?: string }> = ({ value, max = 100, color = 'var(--c-accent)', className = '' }) => (
  <div className={`h-1.5 bg-base rounded-full overflow-hidden ${className}`}>
    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
  </div>
);

export const RatingChip: React.FC<{ value: number; label: string; showCrown?: boolean }> = ({ value, label, showCrown }) => (
  <div className="flex-1 text-center bg-base/70 rounded-lg py-1.5 px-0.5">
    <div className={`num text-[15px] font-bold ${value >= 75 ? 'text-ok' : value >= 62 ? 'text-amber' : 'text-secondary'}`}>{showCrown && value >= 80 ? '★' : ''}{value}</div>
    <div className="text-[9.5px] text-muted uppercase tracking-wide mt-0.5">{label}</div>
  </div>
);

// Basit yerel toast — Aşama 1 (Startup/Yedekleme ekranları)
import { useState as useTState } from 'react';
export const useToast = () => {
  const [msg, setMsg] = useTState<{ text: string; kind: 'ok' | 'warn' } | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const show = React.useCallback((text: string, kind: 'ok' | 'warn' = 'ok') => {
    if (timer.current !== null) clearTimeout(timer.current);
    setMsg({ text, kind });
    timer.current = setTimeout(() => { timer.current = null; setMsg(null); }, 2600);
  }, []);
  const ToastView = msg ? (
    <div role="status" aria-live="polite" className={`fixed left-1/2 -translate-x-1/2 bottom-6 z-[70] px-4 py-2.5 rounded-card text-[13px] font-bold shadow-lg m26-in ${msg.kind === 'ok' ? 'bg-ok text-base' : 'bg-danger text-base'}`}>
      {msg.text}
    </div>
  ) : null;
  return { show, ToastView };
};
