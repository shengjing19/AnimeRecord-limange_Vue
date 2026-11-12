/** 只保留最近一次滚动窗口的帧间隔，不把浏览器挂起时间当成掉帧。 */
export function summarizeFrames(frames) {
  if (!frames.length) return null;

  const sorted = [...frames].sort((a, b) => a - b);
  const percentile = (ratio) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
  // 以较快的一组帧估算刷新周期，兼容 60 / 120 / 144 Hz；不宣称是显示器实际帧率。
  const budget = Math.max(1000 / 240, Math.min(1000 / 60, percentile(0.2)));
  const slow = frames.filter((duration) => duration > budget * 1.5).length;
  return {
    samples: frames.length,
    estimatedFrameBudgetMs: +budget.toFixed(2),
    p95Ms: +percentile(0.95).toFixed(2),
    maxMs: +sorted.at(-1).toFixed(2),
    slowFrames: slow,
    over50Ms: frames.filter((duration) => duration > 50).length,
    slowRatio: +(slow / frames.length).toFixed(3)
  };
}
