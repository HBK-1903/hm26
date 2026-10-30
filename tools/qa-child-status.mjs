// Normalize spawnSync outcomes for the QA runner, including timeouts/signals.
export function qaChildStatus(result) {
  return {
    code: result.status ?? 1,
    error: result.error?.message ?? (result.signal ? `Terminated by ${result.signal}` : ''),
  };
}
