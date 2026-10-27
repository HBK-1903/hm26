import React from 'react';

/**
 * Phaser saha paketi (dinamik chunk) yüklenemediğinde gösterilen salla/boş saha.
 * Maç motoru ve akış saha görselinden bağımsızdır; kullanıcı maçı oynayıp bitirebilir.
 */
export function PitchFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#234d32] text-[#cfe3d4]">
      <div className="text-center px-4">
        <div className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-[#55765d] flex items-center justify-center text-2xl" aria-hidden>⚽</div>
        <p className="text-[11px] font-bold tracking-wide">Saha animasyonu yüklenemedi</p>
        <p className="text-[10px] text-[#9db8a4] mt-1">Maç akışı ve istatistikler normal şekilde devam eder</p>
      </div>
    </div>
  );
}
