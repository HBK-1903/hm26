import React, { useId, useState } from 'react';

type Props<T> = {
  items: readonly T[];
  preview: number;
  label: string;
  rowKey: (item: T, index: number) => React.Key;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  testId?: string;
};

/** A compact overview that can reveal every record already present in the save. */
export function ExpandableRecords<T>({ items, preview, label, rowKey, render, className = '', testId }: Props<T>) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const visible = expanded ? items : items.slice(0, preview);
  return <>
    <div id={listId} data-testid={testId} className={className}>
      {visible.map((item, index) => <React.Fragment key={rowKey(item, index)}>{render(item, index)}</React.Fragment>)}
    </div>
    {items.length > preview && <button type="button" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded((value) => !value)}
      className="w-full min-h-touch rounded-lg border border-line bg-surface px-3 text-[11px] font-bold text-amber">
      {expanded ? `${label}: daha az göster` : `${label}: tümünü göster (${items.length})`}
    </button>}
  </>;
}
