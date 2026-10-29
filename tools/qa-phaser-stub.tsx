// QA stub'ı: jsdom ortamında gerçek PhaserPitch yerine sade bileşen (qa-live-loader.mjs ile yönlendirilir).
import React from 'react';
export function PhaserPitch(props: any) {
  return React.createElement('div', { 'aria-label': 'pitch-stub', 'data-stub': true, 'data-event-kind': props.event?.kind ?? '' });
}
export default PhaserPitch;
