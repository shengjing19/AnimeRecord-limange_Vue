<template>
  <!--
    AppHeader.vue - 顶部导航头组件
    粘性定位，滚动时自动隐藏，提升沉浸式体验
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <header :class="['app-header', { hidden: isHidden }]">
    <div class="header-blur-bg"></div>
    <div class="header-content">
      <div class="title-group">
        <span class="header-subtitle mobile-only">{{ currentDate }}</span>
        <h1 class="page-title">{{ title }}</h1>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

defineProps({
  /** 页面标题 */
  title: { type: String, default: 'limange' }
});

const isHidden = ref(false);
let scrollContainer = null;

const currentDate = computed(() => {
  const date = new Date();
  return `${date.getMonth() + 1}月${date.getDate()}日 星期${['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}`;
});

onMounted(() => {
  scrollContainer = document.querySelector('.app-main');
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onBeforeUnmount(() => {
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll);
  }
});

/**
 * 滚动监听：距离顶部大于80px时隐藏头部
 * 使用 requestAnimationFrame 实现性能节流
 */
let isScrolling = false;

function handleScroll() {
  if (!isScrolling) {
    window.requestAnimationFrame(() => {
      if (scrollContainer) {
        // 移动端不执行自动隐藏逻辑
        if (window.innerWidth <= 768) {
          if (isHidden.value) isHidden.value = false;
        } else {
          isHidden.value = scrollContainer.scrollTop > 80;
        }
      }
      isScrolling = false;
    });
    isScrolling = true;
  }
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 90;
  padding: 30px 50px;
  display: flex;
  align-items: center;
  transition: 0.4s;
}

.app-header.hidden {
  transform: translateY(-100%);
  opacity: 0;
}

.header-blur-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.22) 0%,
    rgba(255, 255, 255, 0) 100%
  );
  z-index: -1;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
  color: var(--sys-text-primary);
  transition: all 0.3s ease;
}

.mobile-only {
  display: none;
}

/* 适配移动端--大标题 (Large Title) 样式 */
@media (max-width: 768px) {
  .app-header {
    padding: max(20px, calc(env(safe-area-inset-top) + 20px)) 24px 16px;
    height: auto;
    min-height: 100px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    z-index: 1000;
    transition: none; /* 移动端不需要隐藏过渡 */
  }

  .app-header.hidden {
    transform: none; /* 强制覆盖隐藏样式 */
    opacity: 1;
  }

  .header-blur-bg {
    display: none; /* 移动端使用整体毛玻璃背景 */
  }

  .header-content {
    justify-content: flex-start; /* 标题左对齐 */
    align-items: flex-end;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mobile-only {
    display: block;
  }

  .header-subtitle {
    font-size: 13px;
    font-weight: 600;
    color: var(--sys-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-left: 2px;
  }

  .page-title {
    font-size: 34px; /* 原生大标题级字号 */
    font-weight: 800;
    letter-spacing: -0.5px;
    text-align: left;
    color: var(--sys-text-primary);
  }
}
</style>
