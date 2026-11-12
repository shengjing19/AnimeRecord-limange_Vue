import { observeLazyImageTarget } from './lazyImageObserver';

const MAX_CONCURRENT_COVERS = 6;
const FALLBACK_COVER = '/img/animerecode.png';
const states = new WeakMap();
const queue = new Set();
let active = 0;

/** 为当前视口附近的图片限流；虚拟行回收时同步取消等待，避免快速滚动积压。 */
function pumpQueue() {
  for (const state of queue) {
    if (active >= MAX_CONCURRENT_COVERS) break;
    queue.delete(state);
    if (state.cancelled) continue;

    active++;
    state.running = true;
    const finish = () => {
      if (!state.running) return;
      state.running = false;
      active--;
      clearTimeout(state.timeout);
      state.element.onload = null;
      state.element.onerror = null;
      pumpQueue();
    };
    state.finish = finish;
    state.element.onload = finish;
    state.element.onerror = () => {
      if (state.element.getAttribute('src') !== FALLBACK_COVER) state.element.src = FALLBACK_COVER;
      else finish();
    };
    state.timeout = setTimeout(() => {
      if (!state.element.complete || !state.element.naturalWidth)
        state.element.src = FALLBACK_COVER;
      finish();
    }, 15000);
    state.element.src = state.url;
  }
}

function cleanup(element) {
  const state = states.get(element);
  if (!state) return;
  state.cancelled = true;
  state.stop?.();
  queue.delete(state);
  if (state.running) {
    element.removeAttribute('src');
    state.finish();
  }
  states.delete(element);
}

function attach(element, url) {
  cleanup(element);
  element.removeAttribute('src');
  const state = { element, url: url || FALLBACK_COVER, cancelled: false, running: false };
  states.set(element, state);
  const root = element.closest('[data-cover-scroll-root], .app-main');
  state.stop = observeLazyImageTarget(element, root, () => {
    if (state.cancelled) return;
    queue.add(state);
    pumpQueue();
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
