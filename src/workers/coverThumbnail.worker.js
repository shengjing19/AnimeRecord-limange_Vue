const MAX_CONCURRENT = 1;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const queue = [];
const jobs = new Map();
let active = 0;

/** 网络、解码、缩放和编码都留在 Worker；主线程只接收卡片大小的 Blob。 */
async function render(job) {
  const timeout = setTimeout(() => job.controller.abort(), 8000);
  let bitmap;
  try {
    const started = performance.now();
    const response = await fetch(job.url, { signal: job.controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error('http');
    if (Number(response.headers.get('content-length')) > MAX_SOURCE_BYTES) throw new Error('size');
    const source = await response.blob();
    if (source.size > MAX_SOURCE_BYTES) throw new Error('size');
    const downloaded = performance.now();
    bitmap = await createImageBitmap(source, { resizeWidth: job.width, resizeQuality: 'low' });
    if (job.controller.signal.aborted) throw new Error('cancelled');

    const height = Math.min(bitmap.height, job.width * 2);
    const width = Math.round((bitmap.width * height) / bitmap.height);
    const canvas = new OffscreenCanvas(width, height);
    // 最终需要回读像素编码，使用 CPU 小画布可避免 GPU 上传后再同步读回。
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    context.fillStyle = '#edf0f4';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    bitmap = null;
    // 列表封面不需要透明通道；JPEG 编码明显快于 WebP，避免缩图吞吐拖慢可见图片。
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.86 });
    if (job.controller.signal.aborted) throw new Error('cancelled');
    self.postMessage({
      id: job.id,
      blob,
      width,
      height,
      downloadMs: downloaded - started,
      thumbnailMs: performance.now() - downloaded,
      sourceBytes: source.size
    });
  } catch {
    self.postMessage({ id: job.id, failed: true });
  } finally {
    bitmap?.close();
    clearTimeout(timeout);
    jobs.delete(job.id);
    active--;
    pump();
  }
}

function pump() {
  while (active < MAX_CONCURRENT && queue.length) {
    const job = queue.shift();
    if (job.controller.signal.aborted) continue;
    active++;
    void render(job);
  }
}

self.onmessage = ({ data }) => {
  if (data.cancel) {
    const job = jobs.get(data.id);
    job?.controller.abort();
    const index = queue.indexOf(job);
    if (index >= 0) {
      queue.splice(index, 1);
      jobs.delete(data.id);
    }
    return;
  }
  const job = { ...data, controller: new AbortController() };
  jobs.set(job.id, job);
  queue.push(job);
  pump();
};
