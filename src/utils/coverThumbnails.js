import { CoverCache } from './coverCache.js';
import { getServerUrl } from './server';
import { countPerformance, recordPerformance, setPerformanceGauge } from './performanceLog.js';

// Blob URL 只持有压缩图片，不保留原图和 ImageBitmap；解码后的纹理由 Chromium 自行回收。
const cache = new CoverCache(16 * 1024 * 1024, (url) => URL.revokeObjectURL(url));
const pending = new Map();
const requests = new Map();
const failedUntil = new Map();
let workers = [];
let unavailable = false;
let sequence = 0;

function updateGauges() {
  setPerformanceGauge('thumbnailCacheEntries', cache.entries.size);
  setPerformanceGauge('thumbnailCacheEncodedMiB', cache.bytes / 1048576);
}

function finish(job, result) {
  pending.delete(job.key);
  requests.delete(job.id);
  if (result?.blob && job.consumers.size) {
    cache.put(job.key, {
      url: URL.createObjectURL(result.blob),
      bytes: result.blob.size
    });
    countPerformance('thumbnailsCreated');
    countPerformance('coverSourceBytes', result.sourceBytes);
    countPerformance('thumbnailBytes', result.blob.size);
    setPerformanceGauge('lastCoverDownloadMs', result.downloadMs);
    setPerformanceGauge('lastThumbnailMs', result.thumbnailMs);
    if (result.downloadMs > 1000) recordPerformance('slow-cover-network', result.downloadMs);
    if (result.thumbnailMs > 100) recordPerformance('slow-worker-thumbnail', result.thumbnailMs);
  } else if (job.consumers.size) {
    countPerformance('thumbnailFallbacks');
    // CORS 不支持/坏图的短期负缓存也有上限，避免收藏数量无限扩大内存。
    failedUntil.set(job.key, Date.now() + 60000);
    if (failedUntil.size > 128) failedUntil.delete(failedUntil.keys().next().value);
  }
  for (const resolve of job.consumers) resolve(cache.acquire(job.key));
  cache.trim();
  updateGauges();
}

function ensureWorker() {
  if (workers.length || unavailable) return workers.length > 0;
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    unavailable = true;
    return false;
  }
  try {
    for (let index = 0; index < Math.min(2, navigator.hardwareConcurrency || 2); index++) {
      const worker = new Worker(new URL('../workers/coverThumbnail.worker.js', import.meta.url), {
        type: 'module'
      });
      worker.onmessage = ({ data }) => {
        const job = requests.get(data.id);
        if (job) finish(job, data.failed ? null : data);
      };
      worker.onerror = () => {
        unavailable = true;
        for (const item of workers) item.terminate();
        workers = [];
        for (const job of [...requests.values()]) finish(job, null);
        recordPerformance('thumbnail-worker-unavailable');
      };
      workers.push(worker);
    }
  } catch {
    for (const item of workers) item.terminate();
    workers = [];
    unavailable = true;
  }
  return workers.length > 0;
}

/** 按尺寸缓存并合并重复封面；可为大卡片指定宽度，释放最后一个消费者时取消后台任务。 */
export function requestCoverThumbnail(url, options = {}) {
  const width = options.width || (window.devicePixelRatio > 1.5 ? 512 : 384);
  // 桌面代理 URL 在换服务器后不变，缓存必须同时区分实际后端。
  const key = `${getServerUrl()}:${width}:${url}`;
  const hit = cache.acquire(key);
  if (hit) {
    countPerformance('thumbnailCacheHits');
    return { promise: Promise.resolve(hit), cancel: () => {} };
  }
  if ((failedUntil.get(key) || 0) > Date.now() || !ensureWorker())
    return { promise: Promise.resolve(null), cancel: () => {} };

  let job = pending.get(key);
  if (!job) {
    let absoluteUrl;
    try {
      absoluteUrl = new URL(url, location.href).href;
    } catch {
      return { promise: Promise.resolve(null), cancel: () => {} };
    }
    const worker = workers[sequence % workers.length];
    job = { id: ++sequence, key, worker, consumers: new Set() };
    pending.set(key, job);
    requests.set(job.id, job);
    worker.postMessage({ id: job.id, url: absoluteUrl, width });
    countPerformance('thumbnailCacheMisses');
  }
  let resolver;
  const promise = new Promise((resolve) => {
    resolver = resolve;
    job.consumers.add(resolve);
  });
  return {
    promise,
    cancel: () => {
      if (!job.consumers.delete(resolver)) return;
      resolver(null);
      if (!job.consumers.size && requests.has(job.id)) {
        if (!unavailable) job.worker.postMessage({ id: job.id, cancel: true });
        pending.delete(key);
        requests.delete(job.id);
      }
    }
  };
}
