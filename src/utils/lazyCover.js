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
  state.request = requestCoverThumbnail(state.url, { width: state.width });
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
      element.classList.remove('is-cover-loading');
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
    element.classList.remove('is-cover-loading');
    finish(state);
  }, 10000);
  element.src = thumbnail?.url || state.url;
}

function cleanup(element) {
  const state = states.get(element);
  if (!state) return;
  state.cancelled = true;
  clearTimeout(state.delayTimer);
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

function getOptions(value) {
  return typeof value === 'string' ? { url: value } : value || {};
}

function attach(element, options) {
  cleanup(element);
  element.classList.add('is-cover-loading');
  element.removeAttribute('src');
  const state = {
    element,
    url: options.url || FALLBACK_COVER,
    width: options.width,
    cancelled: false,
    running: false,
    priority: options.priority || 0
  };
  states.set(element, state);

  // 时间线已经限制了挂载数量，直接按中心优先入队，避免 3D 变换干扰可见性判断。
  if (options.eager) {
    const enqueue = () => {
      state.delayTimer = null;
      queue.add(state);
      schedulePump();
    };
    if (options.delay > 0) state.delayTimer = setTimeout(enqueue, options.delay);
    else enqueue();
    return;
  }

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
    attach(element, getOptions(binding.value));
  },
  updated(element, binding) {
    const options = getOptions(binding.value);
    const previous = getOptions(binding.oldValue);
    if (
      options.url !== previous.url ||
      options.width !== previous.width ||
      options.eager !== previous.eager
    ) {
      attach(element, options);
      return;
    }

    const state = states.get(element);
    if (state && options.eager) {
      state.priority = options.priority || 0;
      // 侧卡进入中心附近时立即提升优先级；离开窗口时由 cleanup 取消尚未开始的请求。
      if (state.delayTimer && !options.delay) {
        clearTimeout(state.delayTimer);
        state.delayTimer = null;
        queue.add(state);
        schedulePump();
      }
    }
  },
  beforeUnmount: cleanup
};
