import { spawn } from 'node:child_process';

/** Start Vite directly, so the runner owns the actual listening process. */
export function startQaPreview(root, port = 4173) {
  return spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '0.0.0.0', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
}

/** Stop only the server we started, and wait until its port is released. */
export async function stopQaPreview(child, timeoutMs = 3000) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    const finish = () => { clearTimeout(timer); resolve(); };
    child.once('exit', finish);
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    if (!child.kill('SIGTERM')) {
      child.removeListener('exit', finish);
      finish();
    }
  });
}
