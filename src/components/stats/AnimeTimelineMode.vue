<template>
  <Teleport to="body">
    <section
      ref="rootRef"
      class="timeline-mode-overlay"
      :class="{ 'is-reduced-motion': reduceMotion }"
      tabindex="-1"
      aria-label="时间线模式"
      @keydown.esc.prevent="emitClose"
      @keydown.left.prevent="stepAnime(-1)"
      @keydown.right.prevent="stepAnime(1)"
      @keydown.up.prevent="selectGroup(groupIndex - 1)"
      @keydown.down.prevent="selectGroup(groupIndex + 1)"
      @keydown.home.prevent="selectGroup(0)"
      @keydown.end.prevent="selectGroup(groups.length - 1)"
    >
      <main class="timeline-scene">
        <button
          class="timeline-close-btn"
          type="button"
          aria-label="关闭时间线模式"
          @click="emitClose"
        >
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>

        <div v-if="loading" class="timeline-state-panel" role="status">
          <span class="timeline-state-loader" aria-hidden="true"></span>
          <strong>正在读取观看档案</strong>
          <p>时间线正在归档你的已看完列表。</p>
        </div>

        <div v-else-if="errorMessage" class="timeline-state-panel is-error" role="alert">
          <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
          <strong>时间线加载失败</strong>
          <p>{{ errorMessage }}</p>
          <button type="button" @click="reloadTimeline">重新加载</button>
        </div>

        <template v-else>
          <div class="timeline-ambient-grid" aria-hidden="true"></div>
          <div class="timeline-terrain" aria-hidden="true"></div>

          <header class="timeline-brand" aria-label="Anime TimeLine">
            <strong>Anime TimeLine</strong>
          </header>

          <aside class="timeline-panel" aria-label="观看年月时间线" @wheel="handleTimelineWheel">
            <div class="timeline-tilt">
              <div class="timeline-axis" aria-hidden="true"></div>
              <div ref="timelineRef" class="timeline-list">
                <button
                  v-for="{ group, index, offset } in visibleMonths"
                  :key="group.key"
                  type="button"
                  :class="[
                    'time-node',
                    {
                      'is-active': index === groupIndex,
                      'is-past': index < groupIndex,
                      'is-future': index > groupIndex
                    }
                  ]"
                  :aria-current="index === groupIndex ? 'true' : 'false'"
                  :aria-label="group.label"
                  :data-group-index="index"
                  :style="{ '--time-offset': offset }"
                  :tabindex="index === groupIndex ? 0 : -1"
                  @click="selectGroup(index)"
                >
                  <span class="time-label">{{ group.label }}</span>
                </button>
              </div>
            </div>
          </aside>

          <section class="timeline-showcase">
            <div class="timeline-month-kicker">
              <span>{{ activeGroup?.label || '--' }}</span>
              <span>{{ activeGroup?.count || 0 }} 部</span>
            </div>

            <div ref="cardStageRef" class="timeline-card-stage" @click="handleCardStageClick">
              <button
                v-for="card in visibleCards"
                :key="card.index"
                type="button"
                :class="[
                  'timeline-anime-card',
                  {
                    active: card.index === animeIndex,
                    'is-active': card.index === animeIndex
                  }
                ]"
                :data-index="card.index"
                :data-flow-index="card.offset"
                :style="card.style"
                :aria-label="`查看 ${card.anime.title}`"
              >
                <img
                  v-lazy-cover="{
                    url: card.anime.coverUrl,
                    width: coverWidth,
                    eager: true,
                    delay: Math.abs(card.offset) > 1 ? 180 : 0,
                    priority: Math.abs(card.offset)
                  }"
                  :alt="`${card.anime.title} 封面`"
                  width="300"
                  height="450"
                  decoding="async"
                />
                <span class="timeline-card-copy">
                  <span class="timeline-card-title">{{ card.anime.title }}</span>
                  <span class="timeline-card-meta">
                    {{ formatDate(card.anime.finishDate) }} ·
                    {{ card.anime.totalEpisodes || '--' }} 集
                  </span>
                </span>
              </button>
            </div>

            <p class="timeline-interaction-hint">点击后方封面切换</p>
          </section>

          <section
            ref="infoConsoleRef"
            class="timeline-info-console"
            aria-label="动漫简介"
            aria-live="polite"
          >
            <div class="timeline-console-head">
              <strong data-detail>{{ displayAnime?.title || '加载中' }}</strong>
              <span data-detail>{{ displayBadge }}</span>
            </div>
            <div class="timeline-console-meta">
              <span data-detail>{{ displayFinishDate }}</span>
              <span data-detail>{{ displayEpisodes }}</span>
            </div>
            <div class="timeline-console-progress" aria-hidden="true">
              <span :style="{ transform: `scaleX(${animeProgress})` }"></span>
            </div>
            <p data-detail class="timeline-console-description">
              {{ displayAnime?.description || '正在读取观看记录...' }}
            </p>
          </section>

          <section ref="statsRef" class="timeline-stats" aria-label="当前动漫数据">
            <article class="timeline-stat">
              <span>动漫名</span>
              <strong data-detail>{{ displayAnime?.title || '--' }}</strong>
              <i class="timeline-stat-line" aria-hidden="true"></i>
            </article>
            <article class="timeline-stat">
              <span>总集数</span>
              <strong data-detail>{{ displayStatEpisodes }}</strong>
              <i class="timeline-stat-line" aria-hidden="true"></i>
            </article>
            <article class="timeline-stat">
              <span>看完时间</span>
              <strong data-detail>{{ displayDateOnly }}</strong>
              <i class="timeline-stat-line" aria-hidden="true"></i>
            </article>
            <article class="timeline-stat">
              <span>本月收录</span>
              <strong data-detail>{{ displayMonthPosition }}</strong>
              <i class="timeline-stat-line" aria-hidden="true"></i>
            </article>
          </section>
        </template>
      </main>
    </section>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { animeApi } from '@/api/anime';
import { getFullImageUrl } from '@/utils/constants';
import { vLazyCover } from '@/utils/lazyCover';
import {
  getTimelineCards,
  getTimelineCardStyle,
  getTimelineMonths,
  wrapTimelineIndex
} from '@/utils/timelineLayout';
import { useAppStore } from '@/stores/app';

const emit = defineEmits(['close']);
const appStore = useAppStore();

const MONTH_WHEEL_INTERVAL = 180;
const DETAIL_DURATION = 180;

const rootRef = ref(null);
const timelineRef = ref(null);
const cardStageRef = ref(null);
const infoConsoleRef = ref(null);
const statsRef = ref(null);
const loading = ref(true);
const errorMessage = ref('');
// 归档数据只整体替换，避免为历史作品创建深层响应式代理。
const groups = shallowRef([]);
const groupIndex = ref(0);
const animeIndex = ref(0);
const viewportWidth = ref(window.innerWidth);
const pixelRatio = ref(window.devicePixelRatio);
const reduceMotion = ref(false);

const transientAnimations = new Set();
const monthAnimations = new Set();
let previousBodyOverflow = '';
let timelineWheelAt = 0;
let motionQuery;
let disposed = false;

const activeGroup = computed(() => groups.value[groupIndex.value] || null);
const activeAnimes = computed(() => activeGroup.value?.animes || []);
const activeAnime = computed(() => activeAnimes.value[animeIndex.value] || null);
const visibleMonths = computed(() => getTimelineMonths(groups.value, groupIndex.value));
// 同一槽位跨月复用按钮和图层，图片指令负责取消旧请求并释放缓存引用。
const visibleCards = computed(() =>
  getTimelineCards(activeAnimes.value, animeIndex.value).map((card) => ({
    ...card,
    style: getTimelineCardStyle(card.offset, viewportWidth.value)
  }))
);
const coverWidth = computed(() => {
  if (viewportWidth.value < 980) return pixelRatio.value > 1.5 ? 512 : 384;
  return pixelRatio.value > 1.5 ? 768 : 512;
});
const animeProgress = computed(() =>
  activeAnimes.value.length ? (animeIndex.value + 1) / activeAnimes.value.length : 0
);

const displayAnime = activeAnime;
const displayBadge = computed(() => {
  if (activeAnime.value?.isFavorite) return 'FAVORITE';
  return activeAnime.value?.isWatching ? 'WATCHING' : 'INFO';
});
const displayDateOnly = computed(() => formatDate(activeAnime.value?.finishDate));
const displayFinishDate = computed(() =>
  activeAnime.value ? `看完 ${displayDateOnly.value}` : '--'
);
const displayEpisodes = computed(() => `${activeAnime.value?.totalEpisodes || '--'} 集`);
const displayStatEpisodes = displayEpisodes;
const displayMonthPosition = computed(() => {
  const count = activeGroup.value?.count || 0;
  return count ? `${animeIndex.value + 1}/${count} 部` : '--';
});

watch(() => appStore.reduceMotion, updateClientFlags);
watch(
  loading,
  (pending) => {
    // 重试按钮随加载分支卸载后会失去焦点，恢复到场景才能继续响应 Esc 和方向键。
    if (!pending && !disposed && !rootRef.value?.contains(document.activeElement)) {
      rootRef.value?.focus({ preventScroll: true });
    }
  },
  { flush: 'post' }
);

onMounted(() => {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', updateClientFlags);
  updateClientFlags();
  window.addEventListener('resize', handleResize, { passive: true });
  rootRef.value?.focus({ preventScroll: true });
  void loadTimelineData();
});

onBeforeUnmount(() => {
  disposed = true;
  stopTransientAnimations();
  stopMonthAnimations();
  motionQuery?.removeEventListener('change', updateClientFlags);
  window.removeEventListener('resize', handleResize);
  document.body.style.overflow = previousBodyOverflow;
});

function emitClose() {
  disposed = true;
  stopTransientAnimations();
  stopMonthAnimations();
  emit('close');
}

function updateClientFlags() {
  reduceMotion.value = appStore.reduceMotion || Boolean(motionQuery?.matches);
  if (reduceMotion.value) {
    stopTransientAnimations();
    stopMonthAnimations();
  }
}

function handleResize() {
  stopMonthAnimations();
  viewportWidth.value = window.innerWidth;
  pixelRatio.value = window.devicePixelRatio;
}

async function loadTimelineData() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await animeApi.getMainList('finished');
    if (disposed) return;

    const normalized = normalizeGroups(response?.data);
    if (!normalized.length) throw new Error('暂无已看完动漫数据');

    groups.value = normalized;
    groupIndex.value = 0;
    animeIndex.value = 0;
    loading.value = false;
    await nextTick();
    if (disposed || reduceMotion.value) return;

    // 入场只处理有限的面板，卡片位置交给浏览器的 transform 过渡。
    animatePanels(
      [
        rootRef.value?.querySelector('.timeline-brand'),
        rootRef.value?.querySelector('.timeline-panel'),
        infoConsoleRef.value,
        statsRef.value
      ],
      320
    );
  } catch (error) {
    if (!disposed) errorMessage.value = extractErrorMessage(error);
  } finally {
    if (!disposed) loading.value = false;
  }
}

function reloadTimeline() {
  if (!loading.value) void loadTimelineData();
}

function normalizeGroups(data) {
  const sourceGroups = Array.isArray(data?.groupedAnimes) ? data.groupedAnimes : [];

  return sourceGroups
    .map((group, groupPosition) => {
      const animes = (Array.isArray(group?.animes) ? group.animes : []).map(
        (anime, animePosition) => ({
          id: anime?.id ?? `${groupPosition}-${animePosition}`,
          title: cleanInline(anime?.title) || '未命名作品',
          coverUrl: getFullImageUrl(cleanInline(anime?.coverImage)),
          totalEpisodes: normalizeNumber(anime?.totalEpisodes),
          finishDate: cleanInline(anime?.finishDate),
          isFavorite: Boolean(anime?.isFavorite),
          isWatching: Boolean(anime?.isWatching),
          description: cleanBlock(anime?.description) || '暂无简介'
        })
      );
      const label =
        `${cleanInline(group?.year)}${cleanInline(group?.month)}` || `分组 ${groupPosition + 1}`;

      return {
        key: `${label}-${groupPosition}`,
        label,
        count: normalizeNumber(group?.count) || animes.length,
        animes
      };
    })
    .filter((group) => group.animes.length);
}

function selectGroup(index) {
  if (disposed || !groups.value.length) return;
  const nextIndex = Math.min(Math.max(index, 0), groups.value.length - 1);
  if (nextIndex === groupIndex.value) return;

  animateMonthShift(nextIndex - groupIndex.value);
  groupIndex.value = nextIndex;
  animeIndex.value = 0;
  animateDetails();
}

function selectAnime(index) {
  if (disposed || index < 0 || index >= activeAnimes.value.length || index === animeIndex.value)
    return;
  animeIndex.value = index;
  animateDetails();
}

function stepAnime(direction) {
  selectAnime(wrapTimelineIndex(animeIndex.value + direction, activeAnimes.value.length));
}

function handleTimelineWheel(event) {
  const delta = viewportWidth.value < 980 ? event.deltaX || event.deltaY : event.deltaY;
  if (!delta || groups.value.length < 2) return;
  event.preventDefault();

  const now = performance.now();
  if (now - timelineWheelAt < MONTH_WHEEL_INTERVAL) return;
  const nextIndex = Math.min(
    Math.max(groupIndex.value + Math.sign(delta), 0),
    groups.value.length - 1
  );
  if (nextIndex === groupIndex.value) return;

  timelineWheelAt = now;
  selectGroup(nextIndex);
}

function handleCardStageClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const card = target?.closest('.timeline-anime-card');
  if (!card || !cardStageRef.value?.contains(card)) return;

  const index = Number(card.dataset.index);
  if (Number.isInteger(index) && index !== animeIndex.value) {
    selectAnime(index);
    return;
  }

  // 前景封面覆盖了侧卡的一部分，在边缘点击仍允许切换相邻作品。
  if (!event.detail || activeAnimes.value.length < 2) return;
  const rect = card.getBoundingClientRect();
  const offset = event.clientX - rect.left - rect.width / 2;
  if (Math.abs(offset) > rect.width * 0.34) stepAnime(Math.sign(offset));
}

function animateDetails() {
  stopTransientAnimations();
  if (!reduceMotion.value) animatePanels([infoConsoleRef.value, statsRef.value], DETAIL_DURATION);
}

/** 将槽位变化抵消在整条轨道上；快速输入时叠加剩余位移，不逐帧读写月份节点。 */
function animateMonthShift(delta) {
  const timeline = timelineRef.value;
  if (!timeline || reduceMotion.value || Math.abs(delta) > 6) {
    stopMonthAnimations();
    return;
  }

  const horizontal = viewportWidth.value < 980;
  const distance = delta * (horizontal ? 9 : 3.5);
  const transform = horizontal ? `translateX(${distance}rem)` : `translateY(${distance}rem)`;
  const animation = timeline.animate(
    [{ transform }, { transform: horizontal ? 'translateX(0rem)' : 'translateY(0rem)' }],
    { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', composite: 'add' }
  );
  monthAnimations.add(animation);
  animation.onfinish = () => {
    monthAnimations.delete(animation);
    animation.cancel();
  };
}

function stopMonthAnimations() {
  for (const animation of monthAnimations) animation.cancel();
  monthAnimations.clear();
}

/** WAAPI 在合成线程插值；取消只释放效果，不回写旧文本或等待上一段动画。 */
function animatePanels(elements, duration) {
  for (const element of elements) {
    if (!element || disposed) continue;
    const animation = element.animate(
      [
        { opacity: 0.65, translate: '0 4px' },
        { opacity: 1, translate: '0 0' }
      ],
      { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    transientAnimations.add(animation);
    animation.onfinish = () => {
      transientAnimations.delete(animation);
      animation.cancel();
    };
  }
}

function stopTransientAnimations() {
  for (const animation of transientAnimations) animation.cancel();
  transientAnimations.clear();
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
}

function cleanInline(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanBlock(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  return data?.message || error?.message || '数据加载失败，请检查后端服务';
}

function formatDate(value) {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${year}.${month}.${day}` : value || '未记录';
}
</script>

<style scoped>
.timeline-mode-overlay {
  position: fixed;
  inset: var(--app-titlebar-height) 0 0;
  z-index: 5000;
  overflow: auto;
  background: #101211;
  color: #f3f8f6;
  font-family: Inter, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif;
  letter-spacing: 0;
}

.timeline-mode-overlay * {
  box-sizing: border-box;
}

.timeline-scene {
  --panel: rgba(28, 31, 30, 0.96);
  --panel-border: rgba(255, 255, 255, 0.09);
  --text: #f3f8f6;
  --muted: rgba(226, 236, 233, 0.48);
  --soft: rgba(226, 236, 233, 0.68);
  --cyan: #a9f2ff;
  --cyan-strong: #d7fbff;
  --amber: #e7c071;
  --rose: #da7f8e;
  --card-w: 300px;
  --card-h: 450px;
  position: relative;
  height: 100%;
  min-height: 720px;
  overflow: hidden;
  isolation: isolate;
  background:
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.5),
      transparent 28%,
      transparent 72%,
      rgba(0, 0, 0, 0.42)
    ),
    linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.46)),
    url('/img/timeline.webp') center center / cover no-repeat,
    #101211;
}

.timeline-scene::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.32),
      transparent 24%,
      transparent 76%,
      rgba(0, 0, 0, 0.28)
    ),
    linear-gradient(180deg, transparent 56%, rgba(0, 0, 0, 0.42));
}

.timeline-close-btn {
  position: absolute;
  top: 24px;
  right: 26px;
  z-index: 70;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  background: rgba(12, 14, 14, 0.58);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.timeline-close-btn:hover,
.timeline-close-btn:focus-visible {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(215, 251, 255, 0.45);
  outline: none;
  transform: translateY(-1px);
}

.timeline-ambient-grid {
  position: absolute;
  inset: 0;
  z-index: -3;
  opacity: 0.08;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: linear-gradient(180deg, transparent, #000 34%, #000 72%, transparent);
}

.timeline-terrain {
  display: none;
  position: absolute;
  left: 21%;
  right: -7%;
  bottom: -23%;
  height: 66%;
  z-index: -2;
  transform: perspective(960px) rotateX(63deg);
  transform-origin: 50% 100%;
  background:
    linear-gradient(
      180deg,
      transparent 0 10%,
      rgba(169, 242, 255, 0.13) 38%,
      rgba(255, 255, 255, 0.07) 46%,
      transparent 74%
    ),
    repeating-linear-gradient(0deg, rgba(215, 251, 255, 0.16) 0 1px, transparent 1px 13px),
    repeating-linear-gradient(90deg, rgba(215, 251, 255, 0.15) 0 1px, transparent 1px 13px), #111716;
  border-top: 1px solid rgba(215, 251, 255, 0.14);
  box-shadow:
    0 -50px 120px rgba(169, 242, 255, 0.22),
    inset 0 80px 180px rgba(169, 242, 255, 0.12),
    inset 0 -120px 190px rgba(0, 0, 0, 0.9);
}

.timeline-brand {
  position: absolute;
  top: 28px;
  left: 70px;
  z-index: 5;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.timeline-brand strong {
  font-size: 18px;
  line-height: 1;
}

.timeline-brand span {
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
}

.timeline-panel {
  position: absolute;
  top: 40vh;
  left: 80px;
  z-index: 40;
  width: 300px;
  height: 60vh;
  overflow: hidden;
  pointer-events: auto;
  user-select: none;
  transform: translateY(-50%);
  mask-image: linear-gradient(to bottom, transparent, #000 7%, #000 93%, transparent);
  perspective: 1200px;
  perspective-origin: left center;
}

.timeline-axis {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 48px;
  z-index: 0;
  display: block;
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
  pointer-events: none;
  transform-origin: top center;
}

.timeline-tilt {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0 40px;
  transform: rotateY(20deg) rotateX(5deg) translateZ(-50px);
  transform-origin: left center;
  transform-style: preserve-3d;
}

.timeline-list {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: visible;
  transform-style: preserve-3d;
  will-change: transform;
}

.time-node {
  position: absolute;
  top: 50%;
  left: 0;
  width: max-content;
  max-width: 280px;
  height: 56px;
  margin: -28px 0 0;
  padding: 0 6px 0 40px;
  border: 0;
  border-radius: 0;
  color: rgba(255, 255, 255, 0.62);
  background: transparent;
  text-align: left;
  cursor: pointer;
  pointer-events: auto;
  transform-origin: left center;
  letter-spacing: 0;
  transform: translate3d(0, calc(var(--time-offset) * 3.5rem), 0);
  transition: opacity 220ms ease;
}

.time-node::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  width: 16px;
  height: 16px;
  border: 2px solid var(--cyan-strong);
  border-radius: 50%;
  background: var(--cyan-strong);
  opacity: 0.4;
  transform: translate(-50%, -50%) scale(0.16);
  transition:
    transform 280ms ease,
    opacity 280ms ease;
}

.time-node:hover,
.time-node:focus-visible {
  color: rgba(255, 255, 255, 0.82);
  outline: 0;
}

.time-node.is-past {
  color: rgba(255, 255, 255, 0.46);
  opacity: 0.72;
}

.time-node.is-past::before {
  background: var(--cyan-strong);
  box-shadow: 0 0 5px rgba(215, 251, 255, 0.27);
}

.time-node.is-future {
  color: rgba(255, 255, 255, 0.56);
  opacity: 0.78;
}

.time-node.is-active {
  color: #fff;
  opacity: 1;
}

.time-node.is-active::before {
  background: rgba(0, 0, 0, 0.5);
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  box-shadow: 0 0 15px rgba(215, 251, 255, 0.53);
}

.time-node.is-active::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  z-index: 1;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cyan-strong);
  transform: translate(-50%, -50%);
}

.time-label {
  display: block;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
  white-space: nowrap;
  transform-origin: left center;
  transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.time-node.is-active .time-label {
  font-weight: 500;
  transform: scale(1.86);
  text-shadow:
    0 0 20px rgba(215, 251, 255, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.8);
}

.timeline-showcase {
  position: absolute;
  inset: 102px 330px 112px 310px;
  z-index: 3;
  display: grid;
  place-items: center;
  overflow: visible;
  perspective: 1200px;
  pointer-events: none;
}

.timeline-month-kicker {
  position: absolute;
  top: 0;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 14px;
  transform: translateX(-50%);
  color: rgba(226, 236, 233, 0.56);
  font-size: 12px;
  text-transform: uppercase;
}

.timeline-month-kicker span:first-child {
  color: var(--cyan-strong);
  font-size: 14px;
}

.timeline-card-stage {
  position: relative;
  width: min(760px, 100%);
  height: 530px;
  overflow: visible;
  pointer-events: auto;
  perspective: 1200px;
  contain: layout;
}

.timeline-anime-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--card-w);
  height: var(--card-h);
  margin: calc(var(--card-h) / -2) 0 0 calc(var(--card-w) / -2);
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  color: var(--text);
  background: #171918;
  box-shadow:
    0 28px 60px rgba(0, 0, 0, 0.48),
    0 0 0 1px rgba(169, 242, 255, 0.04),
    inset 0 0 32px rgba(255, 255, 255, 0.05);
  cursor: pointer;
  backface-visibility: hidden;
  letter-spacing: 0;
  will-change: transform, opacity;
  transition:
    transform 380ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 240ms ease;
  contain: strict;
}

.timeline-anime-card:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 5px;
}

.timeline-anime-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  contain: strict;
}

.timeline-anime-card img.is-cover-loading {
  opacity: 0;
}

.timeline-anime-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent 21%),
    linear-gradient(180deg, transparent 48%, rgba(0, 0, 0, 0.84));
  pointer-events: none;
}

.timeline-card-copy {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  z-index: 1;
  text-align: left;
}

.timeline-card-title {
  display: -webkit-box;
  overflow: hidden;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.82);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.timeline-card-meta {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 11px;
}

.timeline-anime-card.is-missing-cover img {
  opacity: 0;
}

.timeline-anime-card.is-missing-cover {
  background:
    linear-gradient(145deg, rgba(169, 242, 255, 0.2), transparent 46%),
    linear-gradient(315deg, rgba(218, 127, 142, 0.16), transparent 54%), #171918;
}

.timeline-interaction-hint {
  position: absolute;
  right: 4px;
  bottom: 2px;
  margin: 0;
  color: rgba(226, 236, 233, 0.42);
  font-size: 11px;
  pointer-events: none;
}

.timeline-info-console {
  position: absolute;
  top: 24px;
  right: 84px;
  z-index: 5;
  width: 340px;
  max-height: 266px;
  padding: 18px 18px 16px;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  background: var(--panel);
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.28);
  contain: layout paint;
}

.timeline-console-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.timeline-console-head strong {
  display: -webkit-box;
  overflow: hidden;
  color: var(--text);
  font-size: 15px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.timeline-console-head span {
  flex: 0 0 auto;
  color: rgba(169, 242, 255, 0.62);
  font-size: 10px;
}

.timeline-console-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 9px;
  color: rgba(226, 236, 233, 0.45);
  font-size: 11px;
}

.timeline-console-progress {
  height: 2px;
  margin: 16px 0 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.14);
}

.timeline-console-progress span {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, var(--cyan-strong), var(--amber));
  transform-origin: left center;
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline-console-description {
  display: -webkit-box;
  min-height: 80px;
  margin: 0;
  overflow: hidden;
  color: rgba(226, 236, 233, 0.62);
  font-size: 12px;
  line-height: 1.72;
  white-space: pre-line;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.timeline-stats {
  position: absolute;
  right: 360px;
  bottom: 24px;
  left: 68px;
  z-index: 5;
  display: grid;
  grid-template-columns: 1.35fr 0.65fr 0.85fr 0.75fr;
  gap: 20px;
  align-items: end;
  max-width: 760px;
}

.timeline-stat {
  min-width: 0;
}

.timeline-stat span {
  display: block;
  color: rgba(226, 236, 233, 0.38);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.timeline-stat strong {
  display: block;
  min-height: 22px;
  margin-top: 6px;
  overflow: hidden;
  color: var(--text);
  font-size: 16px;
  line-height: 1.28;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-stat-line {
  display: block;
  width: 38px;
  height: 2px;
  margin-top: 8px;
  background: linear-gradient(90deg, var(--cyan-strong), transparent);
  transform: scaleX(1);
  transform-origin: left center;
}

.timeline-state-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 20;
  width: min(420px, calc(100vw - 48px));
  min-height: 190px;
  padding: 30px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(17, 22, 22, 0.82);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  transform: translate(-50%, -50%);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.42);
}

.timeline-state-panel strong {
  font-size: 20px;
}

.timeline-state-panel p {
  margin: 0;
  color: rgba(226, 236, 233, 0.68);
  line-height: 1.7;
}

.timeline-state-panel button {
  min-height: 38px;
  padding: 0 18px;
  border: 1px solid rgba(215, 251, 255, 0.38);
  border-radius: 999px;
  background: rgba(215, 251, 255, 0.1);
  color: #fff;
  cursor: pointer;
}

.timeline-state-panel.is-error i {
  color: #ffb0b8;
  font-size: 28px;
}

.timeline-state-loader {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(255, 255, 255, 0.16);
  border-top-color: var(--cyan-strong);
  border-radius: 50%;
  animation: timeline-spin 0.8s linear infinite;
}

@keyframes timeline-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .timeline-info-console {
    right: 72px;
    width: 310px;
  }

  .timeline-showcase {
    right: 270px;
    left: 250px;
  }

  .timeline-stats {
    right: 300px;
  }
}

@media (max-width: 980px) {
  .timeline-scene {
    --card-w: 150px;
    --card-h: 225px;
    min-height: 840px;
  }

  .timeline-brand {
    left: 28px;
  }

  .timeline-panel {
    top: 72px;
    bottom: auto;
    left: 28px;
    width: calc(100% - 56px);
    height: 84px;
    mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
  }

  .timeline-axis {
    top: 36px;
    right: 0;
    bottom: auto;
    left: 0;
    width: 100%;
    height: 1px;
    transform-origin: left center;
  }

  .timeline-list {
    overflow: visible;
  }

  .timeline-tilt {
    padding: 0;
    transform: none;
  }

  .time-node {
    top: 50%;
    left: 50%;
    width: 136px;
    height: 56px;
    margin: -28px 0 0 -68px;
    padding: 8px 8px 8px 16px;
    transform: translate3d(calc(var(--time-offset) * 9rem), 0, 0);
  }

  .time-node::before {
    top: 50%;
    left: 6px;
  }

  .time-label {
    font-size: 15px;
  }

  .time-node.is-active .time-label {
    transform: scale(1.06);
  }

  .timeline-info-console {
    top: 166px;
    right: 24px;
    left: 24px;
    width: auto;
  }

  .timeline-showcase {
    inset: 318px 18px 160px;
  }

  .timeline-card-stage {
    height: 340px;
  }

  .timeline-stats {
    right: 24px;
    bottom: 24px;
    left: 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px 22px;
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .timeline-mode-overlay *,
  .timeline-mode-overlay *::before,
  .timeline-mode-overlay *::after {
    animation: none;
    transition: none;
  }
}

.is-reduced-motion *,
.is-reduced-motion *::before,
.is-reduced-motion *::after {
  animation: none;
  transition: none;
}

.is-reduced-motion .timeline-anime-card,
.is-reduced-motion .timeline-list {
  will-change: auto;
}
</style>
