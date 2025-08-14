export function formatQueryTime(ms: number) {
  if (ms < 1) {
    // less than 1 millisecond → show μs
    return `${(ms * 1000).toFixed(0)} μs`;
  } else if (ms < 1000) {
    // less than 1 second → show ms
    return `${ms.toFixed(2)} ms`;
  } else if (ms < 60_000) {
    // less than 1 minute → show seconds
    return `${(ms / 1000).toFixed(2)} s`;
  } else {
    // 1 minute or more → show minutes and seconds
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}m ${seconds}s`;
  }
}
