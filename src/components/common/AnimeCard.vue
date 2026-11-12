<template>
  <!--
    AnimeCard.vue - 动漫卡片组件
    封面图片采用懒加载与异步解码，提升性能
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <div ref="cardRef" class="anime-card" @click="handleClick">
    <div class="card-image-wrapper" ref="imgWrapperRef">
      <img
        v-if="shouldLoadImage"
        :src="activeCoverUrl"
        :alt="anime.title"
        decoding="async"
        ref="imgRef"
        @error="handleImageError"
      />
      <div v-else class="card-image-placeholder" aria-hidden="true"></div>
    </div>
    <div class="card-info">
      <div class="card-title" :title="anime.title">{{ anime.title }}</div>
      <div class="card-meta">
        <span>{{ anime.totalEpisodes }}集</span>
        <span>{{ finishYear }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getFullImageUrl } from '@/utils/constants';
import { LAZY_ROOT_MARGIN, observeLazyImageTarget } from '@/utils/lazyImageObserver';

const FALLBACK_COVER_URL = '/img/animerecode.png';

const props = defineProps({
  /** 动漫数据对象 */
  anime: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['click']);

const cardRef = ref(null);
const imgWrapperRef = ref(null);
const imgRef = ref(null);
const shouldLoadImage = ref(false);
const imageFailed = ref(false);
let stopLazyObserve = null;

/** 封面图片完整URL */
const coverUrl = computed(() => getFullImageUrl(props.anime.coverImage));

/** 当前实际渲染的封面URL，失败后切换到本地兜底图 */
const activeCoverUrl = computed(() => (imageFailed.value ? FALLBACK_COVER_URL : coverUrl.value));

/** 完结年份文本 */
const finishYear = computed(() => {
  if (!props.anime.finishDate) return '更新中';
  return props.anime.finishDate.split('-')[0];
});

/**
 * 点击卡片，传递动漫数据 + 源元素信息（用于Hero动画）
 */
function handleClick() {
  const imgWrapper = imgWrapperRef.value;
  const img = imgRef.value;
  const srcRect = imgWrapper ? imgWrapper.getBoundingClientRect() : null;

  emit('click', {
    anime: props.anime,
    sourceRect: srcRect,
    sourceImg: img
  });
}

function cleanupLazyObserver() {
  if (stopLazyObserve) {
    stopLazyObserve();
    stopLazyObserve = null;
  }
}

function revealImage() {
  shouldLoadImage.value = true;
  cleanupLazyObserver();
}

function isNearScrollRoot(target, root) {
  const targetRect = target.getBoundingClientRect();
  const rootRect = root
    ? root.getBoundingClientRect()
    : { top: 0, bottom: window.innerHeight };

  return (
    targetRect.bottom >= rootRect.top - LAZY_ROOT_MARGIN
    && targetRect.top <= rootRect.bottom + LAZY_ROOT_MARGIN
  );
}

function setupLazyObserver() {
  if (shouldLoadImage.value) return;

  nextTick(() => {
    const target = cardRef.value;
    if (!target) {
      revealImage();
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      revealImage();
      return;
    }

    const root = target.closest('.app-main');
    if (isNearScrollRoot(target, root)) {
      revealImage();
      return;
    }

    cleanupLazyObserver();
    stopLazyObserve = observeLazyImageTarget(target, root, revealImage);
  });
}

function handleImageError() {
  if (!imageFailed.value) {
    imageFailed.value = true;
  }
}

watch(coverUrl, () => {
  imageFailed.value = false;
  setupLazyObserver();
});

onMounted(() => {
  setupLazyObserver();
});

onBeforeUnmount(() => {
  cleanupLazyObserver();
});
</script>

<style scoped>
.anime-card {
  cursor: pointer;
  position: relative;
  /* 性能优化--将 all 替换为具体属性 transform，并开启 hardware acceleration */
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  /* 在移动端双列布局中，避免 fixed height 或 intrinsic size 导致的布局撕裂 */
  width: 100%;
  min-width: 0; /* 关键：防止内容撑开 grid column */
}

.anime-card:hover {
  transform: translateY(-8px) scale(1.02);
  will-change: transform;
}

.card-image-wrapper {
  width: 100%;
  position: relative;
  padding-top: 133.33%; /* 3:4 宽高比 */
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.4s ease;
}

.card-image-wrapper img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.card-image-placeholder {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.62)),
    rgba(255, 255, 255, 0.42);
}

.anime-card:hover .card-image-wrapper img {
  transform: scale(1.05);
  will-change: transform;
}

.card-info {
  padding: 8px 10px;
  margin-top: 10px;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  /* 强制固定高度，确保所有卡片文本区域完全一致 */
  height: 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.card-meta {
  font-size: 12px;
  color: #5e5e63;
  display: flex;
  justify-content: space-between;
  font-weight: 600;
}
</style>
