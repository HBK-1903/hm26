import React from 'react';

/**
 * React.lazy sarmalayıcısı: dinamik chunk yüklenemezse (ör. yeni sürüm deploy edilip
 * eski service worker önbelleğindeki hash'li dosya 404 verirse) uygulama çökmek yerine
 * bir kez sayfayı yeniden yükler. sessionStorage bayrağı sonsuz yeniden yükleme döngüsünü engeller;
 * yeniden yükleme de çözmezse sade bir yedek bileşen döner ki maç akışı hiç kopmasın.
 */
export function lazyWithRecovery<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  label: string,
  fallback: React.ComponentType<any>,
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    loader().catch((err) => {
      const key = `m26_chunk_reload_${label}`;
      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(key) === '1'; } catch { /* gizli mod */ }
      if (!alreadyReloaded && typeof window !== 'undefined') {
        try { sessionStorage.setItem(key, '1'); } catch { /* yoksay */ }
        window.location.reload();
        // Yeniden yükleme sırasında bekleyen promise'i askıda tut
        return new Promise<{ default: T }>(() => {});
      }
      console.error(`[hm26] ${label} bileşeni yüklenemedi, yedek gösteriliyor:`, err);
      return { default: fallback as T };
    }),
  );
}
