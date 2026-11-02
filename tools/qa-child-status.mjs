// Normalize spawnSync outcomes for the QA runner, including timeouts/signals.
export function qaChildStatus(result) {
  return {
    code: result.status ?? 1,
    error: result.error?.message ?? (result.signal ? `Terminated by ${result.signal}` : ''),
  };
}

/** Surface failed stages in GitHub's check annotations as well as in artifacts. */
export function qaFailureAnnotation(row) {
  // Important failure lines can appear well before a long passing tail; include
  // them explicitly so CI diagnostics do not depend on downloading artifacts.
  const failures = `${row.stdout ?? ''}\n${row.stderr ?? ''}`.split('\n').filter((line) => /❌|\[FAIL\]/.test(line)).slice(0, 20).join('\n');
  const message = [row.name, `Exit: ${row.code}`, row.error, failures, row.stdout?.slice(-3000), row.stderr?.slice(-2000)].filter(Boolean).join('\n');
  const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  return `::error title=HM26 QA failed::${escaped}`;
}
