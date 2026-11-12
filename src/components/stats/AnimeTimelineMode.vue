<template>
  <Teleport to="body">
    <section
      ref="rootRef"
      class="timeline-mode-overlay"
      tabindex="-1"
      aria-label="时间线模式"
      @keydown.esc.prevent="emitClose"
    >
      <main class="timeline-scene">
        <button class="timeline-close-btn" type="button" aria-label="关闭时间线模式" @click="emitClose">
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

          <aside
            ref="timelinePanelRef"
            class="timeline-panel"
            aria-label="观看年月时间线"
            @wheel="handleTimelineWheel"
          >
            <div class="timeline-tilt">
              <div class="timeline-axis" aria-hidden="true"></div>
              <div ref="timelineRef" class="timeline-list">
                <button
                  v-for="(group, index) in groups"
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
                  @click="selectGroup(index)"
                >
                  <span class="time-label">{{ group.label }}</span>
                </button>
              </div>
            </div>
          </aside>

          <section class="timeline-showcase" aria-live="polite">
            <div class="timeline-month-kicker">
              <span>{{ activeGroup?.label || '--' }}</span>
              <span>{{ activeGroup?.count || 0 }} 部</span>
            </div>

            <div ref="cardStageRef" class="timeline-card-stage" @click="handleCardStageClick">
              <button
                v-for="card in visibleCards"
                :key="`${card.anime.id}-${card.index}`"
                type="button"
                :class="[
                  'timeline-anime-card',
                  {
                    active: card.index === animeIndex,
                    'is-active': card.index === animeIndex
                  }
                ]"
                :data-index="card.index"
                :data-flow-index="getCardFlowIndex(card.index)"
                :aria-label="`查看 ${card.anime.title}`"
              >
                <img
                  :src="card.anime.coverUrl"
                  :alt="`${card.anime.title} 封面`"
                  loading="lazy"
                  decoding="async"
                  @error="handleCoverError"
                />
                <span class="timeline-card-copy">
                  <span class="timeline-card-title">{{ card.anime.title }}</span>
                  <span class="timeline-card-meta">
                    {{ formatDate(card.anime.finishDate) }} · {{ card.anime.totalEpisodes || '--' }} 集
                  </span>
                </span>
              </button>
            </div>

            <p class="timeline-interaction-hint">点击后方封面切换</p>
          </section>

          <section class="timeline-info-console" aria-label="动漫简介">
            <div class="timeline-console-head">
              <strong data-detail>{{ displayAnime?.title || '加载中' }}</strong>
              <span data-detail>{{ displayBadge }}</span>
            </div>
            <div class="timeline-console-meta">
              <span data-detail>{{ displayFinishDate }}</span>
              <span data-detail>{{ displayEpisodes }}</span>
            </div>
            <div class="timeline-console-progress" aria-hidden="true">
              <span ref="progressBarRef"></span>
            </div>
            <p data-detail class="timeline-console-description">
              {{ displayAnime?.description || '正在读取观看记录...' }}
            </p>
          </section>

          <section class="timeline-stats" aria-label="当前动漫数据">
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { animate, createTimeline, cubicBezier, stagger } from 'animejs';
import { animeApi } from '@/api/anime';
import { getFullImageUrl } from '@/utils/constants';

const emit = defineEmits(['close']);

const CARD_WHEEL_INTERVAL = 260;
const VISIBLE_CARD_RADIUS = 3;
const VISIBLE_CARD_LIMIT = VISIBLE_CARD_RADIUS * 2 + 1;

const rootRef = ref(null);
const timelinePanelRef = ref(null);
const timelineRef = ref(null);
const cardStageRef = ref(null);
const progressBarRef = ref(null);

const loading = ref(false);
const errorMessage = ref('');
const groups = ref([]);
const groupIndex = ref(0);
const animeIndex = ref(0);
const displayAnime = ref(null);
const displayGroup = ref(null);
const displayAnimePosition = ref({ index: 0, count: 0 });
const reduceMotion = ref(false);
const hasLoaded = ref(false);

let previousBodyOverflow = '';
let resizeTimer = null;
let timelineWheelAt = 0;

const animations = {
  shell: null,
  timeline: null,
  cardEnter: null,
  cardMotion: [],
  detail: null,
  progress: null
};


const activeGroup = computed(() => groups.value[groupIndex.value] || null);
const activeAnimes = computed(() => activeGroup.value?.animes || []);
const activeAnime = computed(() => activeAnimes.value[animeIndex.value] || null);
const visibleCards = computed(() => {
  const animes = activeAnimes.value;
  const total = animes.length;

  if (total <= VISIBLE_CARD_LIMIT) {
    return animes.map((anime, index) => ({ anime, index }));
  }

  const cards = [];
  const usedIndexes = new Set();

  for (let offset = -VISIBLE_CARD_RADIUS; offset <= VISIBLE_CARD_RADIUS; offset += 1) {
    const index = wrapIndex(animeIndex.value + offset, total);
    if (usedIndexes.has(index)) continue;

    usedIndexes.add(index);
    cards.push({
      anime: animes[index],
      index
    });
  }

  return cards;
});

const displayBadge = computed(() => {
  if (!displayAnime.value) return 'INFO';
  if (displayAnime.value.isFavorite) return 'FAVORITE';
  if (displayAnime.value.isWatching) return 'WATCHING';
  return 'INFO';
});

const displayFinishDate = computed(() =>
  displayAnime.value ? `看完 ${formatDate(displayAnime.value.finishDate)}` : '--'
);

const displayDateOnly = computed(() =>
  displayAnime.value ? formatDate(displayAnime.value.finishDate) : '--'
);

const displayEpisodes = computed(() =>
  displayAnime.value ? `${displayAnime.value.totalEpisodes || '--'} 集` : '--'
);

const displayStatEpisodes = computed(() =>
  displayAnime.value?.totalEpisodes ? `${displayAnime.value.totalEpisodes} 集` : '--'
);

const displayMonthPosition = computed(() => {
  const count = displayAnimePosition.value.count || displayGroup.value?.count || 0;
  if (!count) return '--';
  return `${displayAnimePosition.value.index + 1}/${count} 部`;
});

onMounted(() => {
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  updateClientFlags();
  window.addEventListener('resize', handleResize);

  nextTick(() => {
    rootRef.value?.focus({ preventScroll: true });
  });

  loadTimelineData();
});

onBeforeUnmount(() => {
  cleanupAnimations();
  window.removeEventListener('resize', handleResize);
  clearTimeout(resizeTimer);
  document.body.style.overflow = previousBodyOverflow;
});


function emitClose() {
  cleanupAnimations();
  emit('close');
}

function updateClientFlags() {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function handleResize() {
  updateClientFlags();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!hasLoaded.value) return;
    stopCardEnter();
    layoutCards(false);
    centerActiveTimeline(false);
  }, 160);
}

async function reloadTimeline() {
  hasLoaded.value = false;
  groups.value = [];
  groupIndex.value = 0;
  animeIndex.value = 0;
  displayAnime.value = null;
  displayGroup.value = null;
  await loadTimelineData();
}

async function loadTimelineData() {
  if (loading.value) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await animeApi.getMainList('finished');
    const normalizedGroups = normalizeGroups(response?.data);

    if (!normalizedGroups.length) {
      throw new Error('暂无已看完动漫数据');
    }

    groups.value = normalizedGroups;
    groupIndex.value = 0;
    animeIndex.value = 0;
    hasLoaded.value = true;
    loading.value = false;

    await nextTick();
    centerActiveTimeline(false);
    updateAnimeDetails(false);

    if (reduceMotion.value) {
      await layoutCards(false);
    } else {
      await nextTick();
      animateShell({ includeCards: true });
    }
  } catch (error) {
    errorMessage.value = extractErrorMessage(error);
  } finally {
    if (loading.value) {
      loading.value = false;
    }
  }
}

function normalizeGroups(data) {
  const sourceGroups = Array.isArray(data?.groupedAnimes) ? data.groupedAnimes : [];

  return sourceGroups
    .map((group, groupPosition) => {
      const animes = (Array.isArray(group?.animes) ? group.animes : [])
        .map((anime, animePosition) => {
          const title = cleanInline(anime?.title) || '未命名作品';
          const coverImage = cleanInline(anime?.coverImage);

          return {
            id: anime?.id ?? `${groupPosition}-${animePosition}`,
            title,
            coverImage,
            coverUrl: getFullImageUrl(coverImage),
            totalEpisodes: normalizeNumber(anime?.totalEpisodes),
            finishDate: cleanInline(anime?.finishDate),
            isFavorite: Boolean(anime?.isFavorite),
            isWatching: Boolean(anime?.isWatching),
            description: cleanBlock(anime?.description) || '暂无简介'
          };
        })
        .filter((anime) => anime.title);

      const year = cleanInline(group?.year);
      const month = cleanInline(group?.month);
      const label = `${year}${month}` || `分组 ${groupPosition + 1}`;

      return {
        key: `${label}-${groupPosition}`,
        year,
        month,
        label,
        count: normalizeNumber(group?.count) || animes.length,
        animes
      };
    })
    .filter((group) => group.animes.length);
}

function normalizeNumber(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;
  return Math.trunc(numberValue);
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
  if (typeof data?.message === 'string') return data.message;
  return error?.message || '数据加载失败，请检查后端服务';
}

async function selectGroup(index, options = {}) {
  const nextIndex = clamp(index, 0, groups.value.length - 1);
  if (!options.force && nextIndex === groupIndex.value) return;

  cancelAnimation('shell');
  stopCardEnter();
  groupIndex.value = nextIndex;
  animeIndex.value = 0;

  await nextTick();
  centerActiveTimeline(options.animateCards !== false);
  await layoutCards(options.animateCards !== false);
  updateAnimeDetails(options.animateDetails !== false);
}

async function selectAnime(index) {
  const nextIndex = clamp(index, 0, activeAnimes.value.length - 1);
  if (nextIndex === animeIndex.value) return;

  cancelAnimation('shell');
  stopCardEnter();
  animeIndex.value = nextIndex;

  await nextTick();
  await layoutCards(true);
  updateAnimeDetails(true);
}

function centerActiveTimeline(shouldAnimate = true) {
  const panel = timelinePanelRef.value;
  const timeline = timelineRef.value;
  const activeNode = timeline?.querySelector('.time-node.is-active');

  cancelAnimation('timeline');

  if (!panel || !timeline || !activeNode || window.innerWidth < 980) {
    if (timeline) timeline.style.transform = '';
    return;
  }

  const activeCenter = activeNode.offsetTop + activeNode.offsetHeight / 2;
  const targetCenter = panel.clientHeight / 2;
  const offset = Math.round(targetCenter - activeCenter);

  if (!shouldAnimate || reduceMotion.value) {
    timeline.style.transform = `translateY(${offset}px)`;
    return;
  }

  animations.timeline = animate(timeline, {
    translateY: `${offset}px`,
    duration: 800,
    ease: cubicBezier(0.2, 0.8, 0.2, 1),
    composition: 'replace'
  });
}

function handleTimelineWheel(event) {
  if (window.innerWidth < 980) return;

  event.preventDefault();

  const now = Date.now();
  if (now - timelineWheelAt < CARD_WHEEL_INTERVAL) return;

  const direction = event.deltaY > 0 ? 1 : -1;
  const nextIndex = clamp(groupIndex.value + direction, 0, groups.value.length - 1);

  if (nextIndex !== groupIndex.value) {
    timelineWheelAt = now;
    selectGroup(nextIndex);
  }
}

async function layoutCards(shouldAnimate) {
  await nextTick();

  const cards = getCardElements();
  if (!cards.length) return;

  syncCardZIndex();

  if (!shouldAnimate || reduceMotion.value) {
    cancelCardMotion();
    cards.forEach((card) => {
      applySlot(card, getCardSlot(getElementCardIndex(card)));
      card.style.pointerEvents = 'auto';
      card.style.willChange = 'auto';
    });
    return;
  }

  cancelCardMotion();

  cards.forEach((card) => {
    const index = getElementCardIndex(card);
    const slot = getCardSlot(index);
    card.style.visibility = 'visible';
    card.style.pointerEvents = 'auto';
    card.style.willChange = 'transform, opacity';

    const animation = animate(card, {
      perspective: `${slot.transformPerspective}px`,
      translateX: `${slot.x}px`,
      translateY: `${slot.y}px`,
      translateZ: `${slot.z}px`,
      rotateY: `${slot.rotationY}deg`,
      rotate: `${slot.rotation}deg`,
      scale: slot.scale,
      opacity: slot.autoAlpha,
      duration: 560,
      ease: cubicBezier(0.64, 0, 0.25, 1),
      composition: 'replace',
      onUpdate: (self) => {
        const progress = self.progress > 1 ? self.progress / 100 : self.progress;
        if (progress > 0.47 && card.dataset.zSwapped !== '1') {
          card.style.zIndex = String(slot.zIndex);
          card.dataset.zSwapped = '1';
        }
      },
      onComplete: () => {
        finalizeSlot(card, slot);
        card.style.willChange = 'auto';
        delete card.dataset.zSwapped;
      }
    });

    animations.cardMotion.push(animation);
  });
}

async function playCardEnter(options = {}) {
  await nextTick();

  const cards = getCardElements();
  if (!cards.length) return;

  stopCardEnter();

  if (reduceMotion.value) {
    await layoutCards(false);
    return;
  }

  prepareCardEnter(cards);
  animations.cardEnter = animate(cards, getCardEnterAnimation(options, () => {
    finalizeCardEnter(cards);
    animations.cardEnter = null;
  }));
}

function stopCardEnter() {
  cancelAnimation('cardEnter');
  animations.cardEnter = null;

  getCardElements().forEach((card) => {
    card.style.pointerEvents = 'auto';
    card.style.willChange = 'auto';
  });
}

function prepareCardEnter(cards) {
  const narrow = window.innerWidth < 560;
  const stackY = narrow ? 38 : 50;

  cardStageRef.value?.style.setProperty('perspective', '1200px');
  syncCardZIndex();

  cards.forEach((card) => {
    const slot = getCardSlot(getElementCardIndex(card));
    applySlot(card, {
      ...slot,
      x: 0,
      y: stackY,
      z: 0,
      rotationY: 0,
      rotation: 0,
      autoAlpha: 0
    });
    card.style.visibility = 'visible';
    card.style.pointerEvents = 'none';
    card.style.willChange = 'transform, opacity';
  });
}

function getCardEnterAnimation(options = {}, onComplete) {
  return {
    perspective: (target) => `${getCardSlot(getElementCardIndex(target)).transformPerspective}px`,
    translateX: (target) => `${getCardSlot(getElementCardIndex(target)).x}px`,
    translateY: (target) => `${getCardSlot(getElementCardIndex(target)).y}px`,
    translateZ: (target) => `${getCardSlot(getElementCardIndex(target)).z}px`,
    rotateY: (target) => `${getCardSlot(getElementCardIndex(target)).rotationY}deg`,
    rotate: (target) => `${getCardSlot(getElementCardIndex(target)).rotation}deg`,
    scale: (target) => getCardSlot(getElementCardIndex(target)).scale,
    opacity: (target) => getCardSlot(getElementCardIndex(target)).autoAlpha,
    duration: options.duration || (activeAnimes.value.length > 10 ? 760 : 920),
    delay: (target) => (options.delay || 0) + Math.abs(getCardFlowIndex(getElementCardIndex(target))) * (options.stagger || 34),
    ease: 'outExpo',
    composition: 'replace',
    onUpdate: syncCardZIndex,
    onComplete
  };
}

function finalizeCardEnter(cards) {
  cards.forEach((card) => {
    finalizeSlot(card, getCardSlot(getElementCardIndex(card)));
    card.style.pointerEvents = 'auto';
    card.style.willChange = 'auto';
  });
}

function getCardElements() {
  return Array.from(cardStageRef.value?.querySelectorAll('.timeline-anime-card') || []);
}

function getElementCardIndex(card) {
  const index = Number(card?.dataset?.index);
  return Number.isInteger(index) ? index : 0;
}

function getCardSlot(index) {
  const total = activeAnimes.value.length;
  const offset = getSignedOffset(index, animeIndex.value, total);
  const abs = Math.abs(offset);
  const side = Math.sign(offset);
  const tier = Math.min(abs, 6);
  const narrow = window.innerWidth < 560;
  const tablet = window.innerWidth < 980;

  if (offset === 0) {
    return {
      x: 0,
      y: tablet ? -6 : -22,
      z: 0,
      scale: 1,
      transformPerspective: 900,
      rotationY: 0,
      rotation: 0,
      autoAlpha: 1,
      zIndex: 1000
    };
  }

  const base = narrow ? 130 : tablet ? 178 : 220;
  const step = narrow ? 52 : tablet ? 72 : 92;
  const depth = narrow ? 70 : tablet ? 105 : 150;
  const scaleStep = narrow ? 0.19 : 0.22;
  const transformPerspective = tier === 1 ? 900 : narrow ? 2800 : tablet ? 5200 : 9000;

  return {
    x: side * (base + (tier - 1) * step),
    y: (tier - 1) * (narrow ? 12 : 16) + (narrow ? 16 : 18),
    z: -tier * depth,
    scale: Math.max(narrow ? 0.34 : 0.28, 1 - tier * scaleStep),
    transformPerspective,
    rotationY: side * (-30 - tier * 10),
    rotation: side * -2,
    autoAlpha: Math.max(0, 0.86 - tier * 0.18),
    zIndex: 1000 - tier * 30
  };
}

function applySlot(card, slot) {
  card.style.transform = `perspective(${slot.transformPerspective}px) translate3d(${slot.x}px, ${slot.y}px, ${slot.z}px) rotateY(${slot.rotationY}deg) rotate(${slot.rotation}deg) scale(${slot.scale})`;
  card.style.opacity = String(slot.autoAlpha);
  finalizeSlot(card, slot);
}

function finalizeSlot(card, slot) {
  card.style.opacity = String(slot.autoAlpha);
  card.style.visibility = slot.autoAlpha <= 0 ? 'hidden' : 'visible';
  card.style.zIndex = String(slot.zIndex);
}

function syncCardZIndex() {
  getCardElements().forEach((card) => {
    card.style.zIndex = String(getCardSlot(getElementCardIndex(card)).zIndex);
  });
}

function getSignedOffset(index, activeIndex, total) {
  if (!total) return 0;

  let offset = index - activeIndex;
  const half = total / 2;

  if (offset > half) offset -= total;
  if (offset < -half) offset += total;

  return offset;
}

function getCardFlowIndex(index) {
  return getSignedOffset(index, animeIndex.value, activeAnimes.value.length);
}

function handleCardStageClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const clickedCard = target?.closest('.timeline-anime-card');

  if (!clickedCard || !cardStageRef.value?.contains(clickedCard)) return;

  const clickedIndex = Number(clickedCard.dataset.index);
  if (Number.isInteger(clickedIndex) && clickedIndex !== animeIndex.value) {
    selectAnime(clickedIndex);
    return;
  }

  const activeCard = getCardElements().find((card) => getElementCardIndex(card) === animeIndex.value);
  const stageRect = cardStageRef.value.getBoundingClientRect();
  const clickX = event.clientX - (stageRect.left + stageRect.width / 2);
  const deadZone = (activeCard?.getBoundingClientRect().width || 300) * 0.34;

  if (Math.abs(clickX) <= deadZone) return;

  const sideIndex = getSideCardIndex(Math.sign(clickX));
  if (sideIndex !== null) {
    selectAnime(sideIndex);
  }
}

function getSideCardIndex(direction) {
  const total = activeAnimes.value.length;
  if (!total || !direction) return null;

  for (let index = 0; index < total; index += 1) {
    if (getSignedOffset(index, animeIndex.value, total) === direction) {
      return index;
    }
  }

  return null;
}

function handleCoverError(event) {
  const target = event.target instanceof Element ? event.target : null;
  target?.closest('.timeline-anime-card')?.classList.add('is-missing-cover');
}

function updateAnimeDetails(shouldAnimate) {
  const group = activeGroup.value;
  const anime = activeAnime.value;
  if (!group || !anime) return;

  const apply = () => {
    displayAnime.value = anime;
    displayGroup.value = group;
    displayAnimePosition.value = {
      index: animeIndex.value,
      count: group.count || group.animes.length
    };

    nextTick(() => {
      animateProgress(((animeIndex.value + 1) / group.animes.length) * 100, shouldAnimate);
    });
  };

  const targets = getDetailTargets();

  if (!shouldAnimate || reduceMotion.value || !targets.length || !displayAnime.value) {
    cancelAnimation('detail');
    apply();
    return;
  }

  cancelAnimation('detail');

  animations.detail = animate(targets, {
    opacity: 0,
    translateY: '-8px',
    duration: 140,
    ease: 'outQuad',
    composition: 'replace',
    onComplete: () => {
      apply();
      nextTick(() => {
        const nextTargets = getDetailTargets();
        animations.detail = animate(nextTargets, {
          opacity: [0, 1],
          translateY: ['8px', '0px'],
          duration: 300,
          delay: stagger(18),
          ease: 'outCubic',
          composition: 'replace'
        });
      });
    }
  });
}

function animateProgress(progress, shouldAnimate) {
  const progressBar = progressBarRef.value;
  if (!progressBar) return;

  cancelAnimation('progress');

  const width = `${clamp(progress, 0, 100)}%`;

  if (!shouldAnimate || reduceMotion.value) {
    progressBar.style.width = width;
    return;
  }

  animations.progress = animate(progressBar, {
    width,
    duration: 420,
    ease: 'outCubic',
    composition: 'replace'
  });
}

function getDetailTargets() {
  return Array.from(rootRef.value?.querySelectorAll('[data-detail]') || []);
}

function animateShell(options = {}) {
  cancelAnimation('shell');

  const root = rootRef.value;
  if (!root) return;

  if (reduceMotion.value) {
    return;
  }

  const isDesktop = window.innerWidth >= 980;
  const ambientGrid = root.querySelector('.timeline-ambient-grid');
  const axis = root.querySelector('.timeline-axis');
  const brandParts = Array.from(root.querySelectorAll('.timeline-brand strong, .timeline-brand span'));
  const timeNodes = Array.from(root.querySelectorAll('.time-node'));
  const statItems = Array.from(root.querySelectorAll('.timeline-stat'));
  const statLines = Array.from(root.querySelectorAll('.timeline-stat-line'));
  const monthKicker = root.querySelector('.timeline-month-kicker');
  const infoConsole = root.querySelector('.timeline-info-console');
  const infoText = Array.from(root.querySelectorAll(
    '.timeline-console-head strong, .timeline-console-head span, .timeline-console-meta span, .timeline-console-description'
  ));
  const enterCards = options.includeCards ? getCardElements() : [];
  const shouldAnimateCards = enterCards.length > 0;

  if (shouldAnimateCards) {
    stopCardEnter();
    prepareCardEnter(enterCards);
  }

  if (axis) {
    axis.style.transformOrigin = isDesktop ? 'top center' : 'left center';
    axis.style.transform = isDesktop ? 'scaleY(0)' : 'scaleX(0)';
  }

  statLines.forEach((line) => {
    line.style.transform = 'scaleX(0)';
  });

  const timeline = createTimeline({
    defaults: { ease: 'outCubic' },
    onComplete: () => {
      if (shouldAnimateCards) {
        finalizeCardEnter(enterCards);
      }
      syncCardZIndex();
      animations.shell = null;
    }
  });

  animations.shell = timeline;

  if (ambientGrid) {
    timeline.add(ambientGrid, { opacity: [0, 0.08], scale: [1.025, 1], duration: 900 }, 0);
  }

  if (brandParts.length) {
    timeline.add(brandParts, {
      translateY: ['-18px', '0px'],
      opacity: [0, 1],
      duration: 420,
      delay: stagger(60)
    }, 90);
  }

  if (axis) {
    timeline.add(axis, isDesktop
      ? { scaleY: [0, 1], duration: 820 }
      : { scaleX: [0, 1], duration: 820 }, 120);
  }

  if (timeNodes.length) {
    timeline.add(timeNodes, {
      translateX: ['-24px', '0px'],
      opacity: [0, 1],
      duration: 480,
      delay: stagger(42)
    }, 190);
  }

  if (shouldAnimateCards) {
    timeline.add(enterCards, getCardEnterAnimation({
      duration: activeAnimes.value.length > 10 ? 760 : 920,
      stagger: 32
    }, () => {
      finalizeCardEnter(enterCards);
    }), 300);
  }

  if (monthKicker) {
    timeline.add(monthKicker, {
      translateY: ['20px', '0px'],
      opacity: [0, 1],
      duration: 440
    }, 330);
  }

  if (infoConsole) {
    timeline.add(infoConsole, {
      opacity: [0, 1],
      translateX: ['36px', '0px'],
      clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
      duration: 620,
      ease: 'outQuart'
    }, 500);
  }

  if (progressBarRef.value) {
    timeline.add(progressBarRef.value, {
      scaleX: [0, 1],
      duration: 560
    }, 620);
  }

  if (infoText.length) {
    timeline.add(infoText, {
      translateY: ['12px', '0px'],
      opacity: [0, 1],
      duration: 360,
      delay: stagger(38),
      ease: 'outQuad'
    }, 650);
  }

  if (statItems.length) {
    timeline
      .add(statItems, {
        translateY: ['18px', '0px'],
        opacity: [0, 1],
        duration: 430,
        delay: stagger(70)
      }, 720)
      .add(statLines, {
        scaleX: [0, 1],
        duration: 360,
        delay: stagger(70),
        ease: 'outQuad'
      }, 800);
  }
}

function cleanupAnimations() {
  cancelAnimation('shell');
  cancelAnimation('timeline');
  cancelAnimation('detail');
  cancelAnimation('progress');
  stopCardEnter();
  cancelCardMotion();
}

function cancelCardMotion() {
  animations.cardMotion.forEach((animation) => {
    animation?.cancel?.();
  });
  animations.cardMotion = [];
}

function cancelAnimation(key) {
  const animation = animations[key];
  if (!animation) return;
  animation.cancel?.();
  animations[key] = null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function wrapIndex(index, total) {
  if (!total) return 0;
  return ((index % total) + total) % total;
}

function formatDate(value) {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${year}.${month}.${day}` : value || '未记录';
}
</script>

<style scoped>
.timeline-mode-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  overflow: hidden;
  background: #101211;
  color: #f3f8f6;
  font-family: Inter, "Segoe UI", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  letter-spacing: 0;
}

.timeline-mode-overlay * {
  box-sizing: border-box;
}

.timeline-scene {
  --panel: rgba(34, 36, 35, 0.76);
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
  height: 100vh;
  min-height: 720px;
  overflow: hidden;
  isolation: isolate;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.5), transparent 28%, transparent 72%, rgba(0, 0, 0, 0.42)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.46)),
    url('/img/bg2.png') center center / cover no-repeat,
    #101211;
}

.timeline-scene::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.32), transparent 24%, transparent 76%, rgba(0, 0, 0, 0.28)),
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
  backdrop-filter: blur(16px);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
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
    linear-gradient(180deg, transparent 0 10%, rgba(169, 242, 255, 0.13) 38%, rgba(255, 255, 255, 0.07) 46%, transparent 74%),
    repeating-linear-gradient(0deg, rgba(215, 251, 255, 0.16) 0 1px, transparent 1px 13px),
    repeating-linear-gradient(90deg, rgba(215, 251, 255, 0.15) 0 1px, transparent 1px 13px),
    #111716;
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
  width: 800px;
  height: 60vh;
  overflow: hidden;
  pointer-events: none;
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
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-height: 100%;
  padding: 0;
  overflow: visible;
  transform-style: preserve-3d;
}

.time-node {
  position: relative;
  width: max-content;
  max-width: 720px;
  margin: 0;
  padding: 14px 6px 14px 40px;
  border: 0;
  border-radius: 0;
  color: rgba(255, 255, 255, 0.62);
  background: transparent;
  text-align: left;
  cursor: pointer;
  pointer-events: auto;
  transform-origin: left center;
  letter-spacing: 0;
}

.time-node::before {
  content: "";
  position: absolute;
  left: 8px;
  top: 50%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%);
  transition: box-shadow 500ms ease, background 500ms ease, width 500ms ease, height 500ms ease, border 500ms ease;
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
  filter: drop-shadow(0 12px 22px rgba(0, 0, 0, 0.45));
}

.time-node.is-active::before {
  width: 16px;
  height: 16px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid var(--cyan-strong);
  box-shadow: 0 0 15px rgba(215, 251, 255, 0.53);
}

.time-node.is-active::after {
  content: "";
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
}

.time-node.is-active .time-label {
  font-size: 32px;
  font-weight: 500;
  transform: scale(1.05);
  transform-origin: left center;
  text-shadow: 0 0 20px rgba(215, 251, 255, 0.4), 0 2px 4px rgba(0, 0, 0, 0.8);
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
  contain: layout paint;
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
  transform-style: preserve-3d;
  backface-visibility: hidden;
  letter-spacing: 0;
  opacity: 0;
  visibility: hidden;
  contain: layout paint;
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
  transform: translateZ(1px);
}

.timeline-anime-card::after {
  content: "";
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
    linear-gradient(315deg, rgba(218, 127, 142, 0.16), transparent 54%),
    #171918;
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
  backdrop-filter: blur(16px);
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
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, var(--cyan-strong), var(--amber));
  transform-origin: left center;
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
  backdrop-filter: blur(18px);
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
    flex-direction: row;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 8px;
    scrollbar-width: none;
  }

  .timeline-tilt {
    padding: 0;
    transform: none;
  }

  .timeline-list::-webkit-scrollbar {
    display: none;
  }

  .time-node {
    flex: 0 0 126px;
    padding: 8px 8px 8px 16px;
  }

  .time-node::before {
    top: 33px;
    left: 6px;
  }

  .time-node.is-active::before {
    top: 30px;
  }

  .time-label {
    font-size: 15px;
  }

  .time-node.is-active .time-label {
    font-size: 16px;
    line-height: 1.8;
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
  .timeline-state-loader {
    animation: none;
  }
}
</style>
