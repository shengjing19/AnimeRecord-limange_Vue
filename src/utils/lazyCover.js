import { observeLazyImageTarget } from './lazyImageObserver';
import { requestCoverThumbnail } from './coverThumbnails';
import { countPerformance, setPerformanceGauge, recordPerformance } from './performanceLog';

const MAX_CONCURRENT_COVERS = 4;
const FALLBACK_COVER = '/img/animerecode.png';
const states = new WeakMap();
const queue = new Set();
let active = 0;
let scheduled = false;

function schedulePump() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    pumpQueue();
  });
}

/** 优先可视区域中心，提前加载范围中的卡片不能占满所有槽位。 */
function pumpQueue() {
  const ordered = [...queue].sort((a, b) => a.priority - b.priority);
  for (const state of ordered) {
    if (active >= MAX_CONCURRENT_COVERS) break;
    queue.delete(state);
    if (state.cancelled) continue;

    active++;
    state.running = true;
    void loadCover(state);
  }
  setPerformanceGauge('coverQueue', queue.size);
  setPerformanceGauge('activeCovers', active);
}

function finish(state) {
  if (!state.running) return;
  state.running = false;
  active--;
  clearTimeout(state.timeout);
  state.element.onload = null;
  state.element.onerror = null;
  schedulePump();
}

async function loadCover(state) {
  const started = performance.now();
  state.request = requestCoverThumbnail(state.url);
  const thumbnail = await state.request.promise;
  if (state.cancelled) {
    thumbnail?.release();
    return;
  }
  state.thumbnail = thumbnail;
  const element = state.element;
  element.onload = async () => {
    // 等待小图解码完成再释放加载槽，避免一帧集中解码大量缓存命中图片。
    try {
      await element.decode();
    } catch {
      /* 变更源或回收时 decode 可中断。 */
    }
    if (!state.cancelled) {
      countPerformance('coversDisplayed');
      if (performance.now() - started > 1000)
        recordPerformance('slow-cover-ready', performance.now() - started);
    }
    finish(state);
  };
  element.onerror = () => {
    countPerformance('coverErrors');
    if (element.getAttribute('src') !== FALLBACK_COVER) element.src = FALLBACK_COVER;
    else finish(state);
  };
  state.timeout = setTimeout(() => {
    countPerformance('coverTimeouts');
    if (!element.complete || !element.naturalWidth) element.src = FALLBACK_COVER;
    finish(state);
  }, 10000);
  element.src = thumbnail?.url || state.url;
}

function cleanup(element) {
  const state = states.get(element);
  if (!state) return;
  state.cancelled = true;
  state.stop?.();
  queue.delete(state);
  state.request?.cancel();
  state.thumbnail?.release();
  if (state.running) {
    element.removeAttribute('src');
    finish(state);
  }
  states.delete(element);
}

function attach(element, url) {
  cleanup(element);
  element.removeAttribute('src');
  const state = {
    element,
    url: url || FALLBACK_COVER,
    cancelled: false,
    running: false,
    priority: 0
  };
  states.set(element, state);
  const root = element.closest('[data-cover-scroll-root], .app-main');
  state.stop = observeLazyImageTarget(element, root, (entry) => {
    if (state.cancelled) return;
    if (entry?.rootBounds) {
      state.priority = Math.abs(
        entry.boundingClientRect.top +
          entry.boundingClientRect.height / 2 -
          entry.rootBounds.top -
          entry.rootBounds.height / 2
      );
    }
    queue.add(state);
    schedulePump();
  });
}

export const vLazyCover = {
  mounted(element, binding) {
    attach(element, binding.value);
  },
  updated(element, binding) {
    if (binding.value !== binding.oldValue) attach(element, binding.value);
  },
  beforeUnmount: cleanup
};
