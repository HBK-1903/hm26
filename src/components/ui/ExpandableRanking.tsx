import React, { useState } from 'react';
import { Card, Sheet } from './kit';

type ExpandableRankingProps<T> = {
  title: string;
  rows: readonly T[];
  previewLimit: number;
  unit: string;
  rowKey: (row: T, index: number) => React.Key;
  renderRow: (row: T, index: number, detail: boolean) => React.ReactNode;
  empty: React.ReactNode;
  description?: React.ReactNode;
  detailNote?: React.ReactNode;
  embedded?: boolean;
  testId?: string;
  listTestId?: string;
  listClassName?: string;
  rowClassName?: string;
};

/** A short overview plus the complete, scrollable ranking from the same data. */
export function ExpandableRanking<T>({
  title, rows, previewLimit, unit, rowKey, renderRow, empty, description, detailNote,
  embedded = false, testId, listTestId, listClassName = '',
  rowClassName = 'border-b border-line/40 last:border-0',
}: ExpandableRankingProps<T>) {
  const [open, setOpen] = useState(false);
  const titleClass = embedded
    ? 'text-[10px] text-muted uppercase font-bold'
    : 'font-display font-bold text-[13px] text-primary';
  const headerClass = embedded ? 'py-1' : 'px-4 py-2.5 border-b border-line';
  const content = (
    <div data-testid={testId}>
      {rows.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label={`${title} sıralamasının tümünü gör`}
          className={`${headerClass} w-full min-h-touch flex items-center justify-between gap-3 text-left rounded-t-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber`}
        >
          <span className={titleClass}>{title}</span>
          <span className="shrink-0 text-[11px] font-bold text-amber whitespace-nowrap">Tümünü gör <span className="num">({rows.length})</span> <span aria-hidden="true">›</span></span>
        </button>
      ) : <div className={headerClass}><span className={titleClass}>{title}</span></div>}
      {description && <div className="px-4 py-2 text-[10.5px] text-muted leading-snug border-b border-line/40">{description}</div>}
      {rows.length ? (
        <ol className={listClassName} data-testid={listTestId}>
          {rows.slice(0, previewLimit).map((row, index) => <li key={rowKey(row, index)} className={rowClassName}>{renderRow(row, index, false)}</li>)}
        </ol>
      ) : empty}
    </div>
  );

  return (
    <>
      {embedded ? content : <Card className="!p-0 overflow-hidden">{content}</Card>}
      {open && (
        <Sheet open onClose={() => setOpen(false)} title={`${title} · Tüm sıralama`} tall>
          <p className="text-[11.5px] text-muted leading-snug pb-3">
            <span className="num font-bold text-primary">{rows.length} {unit}</span> · Mevcut kayıtlı veriler gösterilir.
            {detailNote && <> {detailNote}</>}
          </p>
          <ol className={listClassName} aria-label={`${title} sıralaması`}>
            {rows.map((row, index) => <li key={rowKey(row, index)} className={rowClassName}>{renderRow(row, index, true)}</li>)}
          </ol>
        </Sheet>
      )}
    </>
  );
}
