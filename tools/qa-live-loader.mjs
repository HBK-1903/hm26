// QA amaçlı ESM resolve hook: jsdom ortamında Phaser saha paketini sade stub'a yönlendirir.
// Maç motoru ve React akışı saha görselinden bağımsız olduğu için testler pitch olmadan çalışır.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.includes('PhaserPitch')) {
    return { url: new URL('./qa-phaser-stub.tsx', import.meta.url).href, shortCircuit: true };
  }
  if (specifier.endsWith('.css')) {
    return { url: 'data:text/javascript,export default {}', shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
