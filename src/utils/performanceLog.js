import { summarizeFrames } from './performanceMetrics.js';
import { APP_CONFIG } from './constants';

const STORAGE_KEY = 'limange_performance_last';
const MAX_EVENTS = 180;
const MAX_WINDOWS = 120;
const MAX_FRAMES = 360;
const counters = Object.create(null);
const gauges = Object.create(null);
const events = [];
const windows = [];
let enabled = true;
let runtime = null;
let startedAt = new Date().toISOString();
let saveTimer = 0;
let activeUntil = 0;
let frame = 0;
let previous = 0;
let frames = [];
let installed = false;
let longTaskObserver;
let previousReport = null;

function appendBounded(list, value, limit) {
  list.push(value);
  if (list.length > limit) list.shift();
}

/** 日志只接收固定指标名和数值，调用点不得传入标题、URL、响应体或凭证。 */
export function countPerformance(name, amount = 1) {
  if (enabled) counters[name] = (counters[name] || 0) + amount;
}

export function setPerformanceGauge(name, value) {
  if (enabled && Number.isFinite(value)) gauges[name] = +value.toFixed(2);
}

export function recordPerformance(name, durationMs = 0) {
  if (!enabled) return;
  appendBounded(
    events,
    {
      at: new Date().toISOString(),
      name,
      durationMs: +durationMs.toFixed(2),
      duringScroll: performance.now() < activeUntil
    },
    MAX_EVENTS
  );
}

export function getPerformanceReport() {
  return {
    schema: 1,
    appVersion: APP_CONFIG.version,
    startedAt,
    exportedAt: new Date().toISOString(),
    enabled,
    environment: {
      runtime,
      viewport: [window.innerWidth, window.innerHeight],
      pixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency,
      workerThumbnails: typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined',
      longTasks: PerformanceObserver.supportedEntryTypes?.includes('longtask') || false
    },
    counters: { ...counters },
    gauges: { ...gauges },
    scrollWindows: [...windows],
    events: [...events]
  };
}

function persist() {
  clearTimeout(saveTimer);
  // 仅在滚动结束后写一次有界快照，避免同步存储进入滚动热路径。
  if (enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getPerformanceReport()));
    } catch {
      /* 存储不可用时仍可导出当前内存日志。 */
    }
  }
}

function flushFrames() {
  const summary = summarizeFrames(frames);
  frames = [];
  previous = 0;
  if (!summary) return;
  appendBounded(windows, { at: new Date().toISOString(), ...summary }, MAX_WINDOWS);
  if (summary.over50Ms || summary.slowRatio > 0.15) recordPerformance('scroll-jank', summary.maxMs);
}

function sampleFrame(now) {
  frame = 0;
  if (!enabled || document.hidden) {
    flushFrames();
    return;
  }
  if (previous) frames.push(now - previous);
  previous = now;
  if (frames.length >= MAX_FRAMES) flushFrames();

  if (now < activeUntil) frame = requestAnimationFrame(sampleFrame);
  else {
    flushFrames();
    saveTimer = window.setTimeout(persist, 800);
  }
}

/** 一个应用级捕获监听器，只在用户滚动及结束后 160ms 采样；静止时没有常驻 RAF。 */
function onScroll(event) {
  if (!enabled || document.hidden || !(event.target instanceof Element)) return;
  if (!event.target.matches('.app-main, [data-cover-scroll-root]')) return;
  clearTimeout(saveTimer);
  activeUntil = performance.now() + 160;
  if (!frame) frame = requestAnimationFrame(sampleFrame);
}

export function setPerformanceEnabled(value) {
  enabled = Boolean(value);
  localStorage.setItem('app_performance_monitor', String(enabled));
  if (!enabled) {
    cancelAnimationFrame(frame);
    clearTimeout(saveTimer);
    frame = 0;
    frames = [];
    previous = 0;
  }
}

export function clearPerformanceLog() {
  for (const key of Object.keys(counters)) delete counters[key];
  events.length = 0;
  windows.length = 0;
  frames = [];
  startedAt = new Date().toISOString();
  localStorage.removeItem(STORAGE_KEY);
  previousReport = null;
}

export function getPreviousPerformanceReport() {
  return previousReport;
}

export function exportPerformanceLog(previousReport = false) {
  const report = previousReport ? getPreviousPerformanceReport() : getPerformanceReport();
  if (!report) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `limange-performance-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function installPerformanceLog() {
  if (installed) return;
  installed = true;
  try {
    previousReport = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    /* 旧日志损坏不影响本次诊断。 */
  }
  enabled = localStorage.getItem('app_performance_monitor') !== 'false';
  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    cancelAnimationFrame(frame);
    frame = 0;
    flushFrames();
    persist();
  });
  window.addEventListener('pagehide', persist);
  if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    longTaskObserver = new PerformanceObserver((list) => {
      if (document.hidden) return;
      for (const entry of list.getEntries()) {
        countPerformance('longTasks');
        recordPerformance('main-thread-long-task', entry.duration);
      }
    });
    longTaskObserver.observe({ type: 'longtask' });
  }
  window.limangeDesktop
    ?.getPerformanceInfo?.()
    .then((info) => {
      runtime = info;
    })
    .catch(() => {
      recordPerformance('runtime-info-unavailable');
    });
}
