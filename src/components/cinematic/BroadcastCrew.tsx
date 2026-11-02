import React from 'react';

/** A small, decorative camera operator in the same flat style as the arrival.
 * No text, logos or fictional identities are introduced into career data. */
export const BroadcastCrew: React.FC<{ className: string }> = ({ className }) => <svg
  className={className} data-testid="broadcast-camera-operator" viewBox="0 0 120 155"
  aria-hidden="true" focusable="false">
  <ellipse cx="69" cy="150" rx="44" ry="5" fill="#304c41" opacity=".25" />
  <g className="broadcast-crew__operator">
    <path d="M66 105l-4 39M84 105l8 39" fill="none" stroke="#344b45" strokeWidth="11" strokeLinecap="round" />
    <path d="M61 145h-8M91 145h8" fill="none" stroke="#263c37" strokeWidth="6" strokeLinecap="round" />
    <path d="M57 63Q64 54 77 55Q91 55 97 66l-2 43H56Z" fill="#607a6c" stroke="#355348" strokeWidth="3" />
    <path d="M62 72h29M75 58v48" fill="none" stroke="#b8cab1" strokeWidth="2" opacity=".55" />
    <circle cx="78" cy="42" r="16" fill="#ca9672" stroke="#574b3b" strokeWidth="2" />
    <path d="M62 39q0-18 15-18 16 0 17 15-9-4-16-7-6 9-16 10Z" fill="#3d3731" />
    <path d="M61 70Q54 81 43 69M88 70Q85 84 67 78" fill="none" stroke="#607a6c" strokeWidth="10" strokeLinecap="round" />
    <circle cx="43" cy="69" r="5" fill="#ca9672" /><circle cx="67" cy="78" r="5" fill="#ca9672" />
    <g className="broadcast-crew__camera">
      <rect x="28" y="45" width="41" height="27" rx="4" fill="#283f3d" stroke="#172d2b" strokeWidth="3" />
      <path d="M29 49L14 53v12l15 4Z" fill="#3a5951" stroke="#172d2b" strokeWidth="2" />
      <ellipse cx="14" cy="59" rx="4" ry="7" fill="#9cbcb4" stroke="#172d2b" strokeWidth="2" />
      <rect x="52" y="39" width="11" height="7" rx="2" fill="#263f39" /><circle className="broadcast-crew__tally" cx="62" cy="51" r="2.5" fill="#d8836e" />
      <path d="M37 50h12M37 55h8" stroke="#86a79a" strokeWidth="2" strokeLinecap="round" />
    </g>
  </g>
</svg>;
