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
        <h1 class="page-title">{{ title }}</h1>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

defineProps({
  /** 页面标题 */
  title: { type: String, default: 'limange' }
});

const isHidden = ref(false);
let scrollContainer = null;


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
        isHidden.value = scrollContainer.scrollTop > 80;
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
</style>
