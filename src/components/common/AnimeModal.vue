<template>
  <!--
    AnimeModal.vue - 动漫详情全屏页
    设计灵感来自 Kazumi Android 动漫详情页：
    - 高斯模糊封面背景头图 (_InfoHeaderBackground)
    - 海报 + 信息卡横向布局 (BangumiInfoCardV)
    - 从底部滑入的转场动画 (CupertinoPageTransition)
    - Hero 海报从卡片位置飞入详情页 (animejs v4)
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <Teleport to="body">
    <!-- Hero 浮动海报 -->
    <div v-if="flying" ref="flyingEl" class="detail-flying-poster">
      <img :src="coverUrl" alt="" />
    </div>

    <!-- 详情页主体 -->
    <div v-if="visible" class="detail-overlay" ref="overlayRef">
      <!-- 顶栏 -->
      <header class="detail-topbar">
        <button class="detail-back-btn" @click="close" aria-label="返回">
          <i class="fas fa-arrow-left"></i>
        </button>
        <span class="detail-topbar-title" :class="{ 'is-visible': scrolled }">
          {{ anime?.title || '' }}
        </span>
      </header>

      <!-- 滚动内容区 -->
      <div class="detail-scroll" ref="scrollRef" @scroll="onScroll">
        <!-- 模糊背景头图 -->
        <div class="detail-header">
          <div class="detail-header-bg" v-if="posterReady">
            <img
              :src="coverUrl"
              class="detail-header-bg-img"
              alt=""
              aria-hidden="true"
            />
            <div class="detail-header-blur"></div>
          </div>
          <div class="detail-header-fade"></div>
        </div>

        <!-- 信息卡片 -->
        <div class="detail-info-card">
          <div class="detail-poster" ref="posterRef">
            <img v-if="posterReady" :src="coverUrl" :alt="anime?.title || '封面'" />
          </div>
          <div class="detail-info">
            <h1 class="detail-title">{{ anime?.title || '加载中...' }}</h1>
            <div class="detail-meta">
              <div class="detail-meta-item">
                <i class="fas fa-tv"></i>
                <span>{{ anime?.totalEpisodes || '-' }} 集</span>
              </div>
              <div class="detail-meta-item">
                <i class="fas fa-calendar-alt"></i>
                <span>{{ anime?.finishDate || '暂无' }}</span>
              </div>
              <div class="detail-meta-item" :class="{ 'is-fav': anime?.isFavorite }">
                <i class="fas fa-heart"></i>
                <span>{{ anime?.isFavorite ? '已收藏' : '未收藏' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 简介 -->
        <div class="detail-description">
          <h3 class="detail-section-title">
            <i class="fas fa-align-left"></i> 简介
          </h3>
          <p class="detail-desc-text">
            {{ anime?.description || '暂无简介' }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { createTimeline, cubicBezier } from 'animejs';
import { getFullImageUrl } from '@/utils/constants';

const props = defineProps({
  /** 是否显示 */
  visible: { type: Boolean, default: false },
  /** 动漫详情数据 */
  anime: { type: Object, default: null },
  /** 源卡片封面区域 rect */
  sourceRect: { type: Object, default: null },
  /** 源卡片封面 img 元素 */
  sourceImg: { type: Object, default: null }
});

const emit = defineEmits(['close']);

const overlayRef = ref(null);
const posterRef = ref(null);
const scrollRef = ref(null);
const flyingEl = ref(null);
const scrolled = ref(false);
const flying = ref(false);
const posterReady = ref(false);

let activeTimeline = null;

const coverUrl = computed(() => {
  if (!props.anime) return '';
  return getFullImageUrl(props.anime.coverImage);
});

function onScroll() {
  if (scrollRef.value) {
    scrolled.value = scrollRef.value.scrollTop > 80;
  }
}

/**
 * 关闭动画：详情页渐隐 + 海报飞回卡片原位
 */
function close() {
  if (activeTimeline) {
    activeTimeline.pause();
    activeTimeline = null;
  }

  const overlay = overlayRef.value;
  const targetPoster = posterRef.value;
  const src = props.sourceRect;

  if (!overlay) {
    flying.value = false;
    posterReady.value = false;
    if (props.sourceImg) {
      props.sourceImg.style.removeProperty('transition');
      props.sourceImg.style.removeProperty('opacity');
    }
    emit('close');
    return;
  }

  posterReady.value = false;

  const ease = cubicBezier(0.4, 0, 0.2, 1);

  if (src && targetPoster) {
    const tgtRect = targetPoster.getBoundingClientRect();

    flying.value = true;

    nextTick(() => {
      const flyEl = flyingEl.value;
      if (!flyEl) {
        flying.value = false;
        emit('close');
        return;
      }

      Object.assign(flyEl.style, {
        position: 'fixed',
        top: tgtRect.top + 'px',
        left: tgtRect.left + 'px',
        width: tgtRect.width + 'px',
        height: tgtRect.height + 'px',
        borderRadius: '16px',
        overflow: 'hidden',
        zIndex: '3001',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
      });

      const tl = createTimeline({
        onComplete: () => {
          flying.value = false;
          posterReady.value = false;
          overlay.style.transform = '';
          overlay.style.opacity = '';
          overlay.style.willChange = '';
          if (props.sourceImg) {
            // 关键修复：先在无过渡状态下恢复透明度并强制重绘，防止触发 CSS 渐变动画导致的闪烁
            props.sourceImg.style.setProperty('opacity', '1', 'important');
            void props.sourceImg.offsetHeight; // 强制重绘
            props.sourceImg.style.removeProperty('transition');
            props.sourceImg.style.removeProperty('opacity');
          }
          activeTimeline = null;
          emit('close');
        }
      });

      activeTimeline = tl;

      tl.add(overlay, {
        opacity: [1, 0],
        duration: 280,
        ease
      }, 0);

      tl.add(flyEl.style, {
        top: src.top,
        left: src.left,
        width: src.width,
        height: src.height,
        duration: 300,
        ease
      }, 0);
    });
    return;
  }

  // 无源位置：仅渐隐
  const tl = createTimeline({
    onComplete: () => {
      posterReady.value = false;
      overlay.style.transform = '';
      overlay.style.opacity = '';
      if (props.sourceImg) {
        props.sourceImg.style.setProperty('opacity', '1', 'important');
        void props.sourceImg.offsetHeight;
        props.sourceImg.style.removeProperty('transition');
        props.sourceImg.style.removeProperty('opacity');
      }
      activeTimeline = null;
      emit('close');
    }
  });

  activeTimeline = tl;

  tl.add(overlay, {
    opacity: [1, 0],
    duration: 250,
    ease
  }, 0);
}

/**
 * Hero 动画--海报从卡片位置飞入详情页 + 详情页从底部滑入
 */
function playHeroAnimation() {
  const overlay = overlayRef.value;

  if (!overlay) return;

  const src = props.sourceRect;
  const flyEl = flyingEl.value;
  const targetPoster = posterRef.value;
  const hasFly = src && flyEl && targetPoster;

  let tgtRect = null;

  if (hasFly) {
    overlay.style.transform = 'translateY(0)';
    overlay.style.willChange = 'transform, opacity';
    tgtRect = targetPoster.getBoundingClientRect();
    overlay.style.transform = 'translateY(100%)';

    Object.assign(flyEl.style, {
      position: 'fixed',
      top: src.top + 'px',
      left: src.left + 'px',
      width: src.width + 'px',
      height: src.height + 'px',
      borderRadius: '16px',
      overflow: 'hidden',
      zIndex: '3001',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      willChange: 'transform'
    });
  }

  if (hasFly && props.sourceImg) {
    props.sourceImg.style.setProperty('transition', 'none', 'important');
    props.sourceImg.style.setProperty('opacity', '0', 'important');
  }

  const ease = cubicBezier(0.4, 0, 0.2, 1);

  const tl = createTimeline({
    onComplete: () => {
      flying.value = false;
      posterReady.value = true;
      overlay.style.willChange = '';
      activeTimeline = null;
    }
  });

  activeTimeline = tl;

  tl.add(overlay, {
    translateY: ['100%', '0%'],
    opacity: [0, 1],
    duration: 420,
    ease
  }, 0);

  if (hasFly && tgtRect) {
    tl.add(flyEl.style, {
      top: tgtRect.top,
      left: tgtRect.left,
      width: tgtRect.width,
      height: tgtRect.height,
      duration: 400,
      ease
    }, 0);
  }
}

watch(() => props.visible, async (val) => {
  if (val) {
    scrolled.value = false;
    posterReady.value = false;
    if (scrollRef.value) scrollRef.value.scrollTop = 0;
    if (props.sourceRect) flying.value = true;
    await nextTick();

    // 无源位置时直接显示海报
    if (!props.sourceRect) posterReady.value = true;

    try {
      playHeroAnimation();
    } catch (e) {
      flying.value = false;
      posterReady.value = true;
      if (overlayRef.value) {
        overlayRef.value.style.transform = 'translateY(0)';
        overlayRef.value.style.opacity = '1';
      }
    }
  }
});
</script>

<style scoped>
/* ========== 页面容器 ========== */
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  background: #fff;
}

/* ========== 顶栏 ========== */
.detail-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  padding-top: max(14px, env(safe-area-inset-top));
}

.detail-back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: var(--sys-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: 0.2s;
  flex-shrink: 0;
}

.detail-back-btn:hover {
  background: #fff;
  transform: scale(1.05);
}

.detail-topbar-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--sys-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 0.25s;
}

.detail-topbar-title.is-visible {
  opacity: 1;
}

/* ========== 滚动区 ========== */
.detail-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ========== 头部模糊背景 ========== */
.detail-header {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
}

.detail-header-bg {
  position: absolute;
  inset: 0;
}

.detail-header-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.1);
}

.detail-header-blur {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  background: rgba(255, 255, 255, 0.25);
}

.detail-header-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 10px;
  background: linear-gradient(to bottom, transparent, #fff);
  pointer-events: none;
}

/* ========== 信息卡片 ========== */
.detail-info-card {
  display: flex;
  gap: 28px;
  padding: 0 28px;
  margin-top: -80px;
  position: relative;
  z-index: 2;
  max-width: 800px;
}

.detail-poster {
  width: 140px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  aspect-ratio: 3/4;
  border: 2px solid rgba(255, 255, 255, 0.6);
}

.detail-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 4px;
}

.detail-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--sys-text-primary);
  line-height: 1.3;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.04);
  color: var(--sys-text-secondary);
}

.detail-meta-item i {
  font-size: 13px;
  color: var(--sys-blue);
}

.detail-meta-item.is-fav {
  color: #e11d48;
  background: rgba(225, 29, 72, 0.08);
}

.detail-meta-item.is-fav i {
  color: #e11d48;
}

/* ========== 简介区 ========== */
.detail-description {
  padding: 28px;
  max-width: 800px;
}

.detail-section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--sys-text-primary);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-section-title i {
  color: var(--sys-blue);
  font-size: 14px;
}

.detail-desc-text {
  font-size: 15px;
  line-height: 1.9;
  color: var(--sys-text-secondary);
  white-space: pre-wrap;
}

/* 浮动海报 */
.detail-flying-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 适配移动端：放大的返回按钮 */
@media (max-width: 768px) {
  .detail-back-btn {
    width: 50px !important;
    height: 50px !important;
    font-size: 24px !important;
  }
}
</style>
