<template>
  <!--
    @file AppBottomBar.vue
    @description 移动端的仿“ iOS 26 风格”三岛式悬浮底部导航栏
    @update 2026-06-01 - 简化为高品质磨砂玻璃视觉效果，确保阅读与触控体验
  -->
  <div class="mobile-nav-container mobile-only">
    <!-- 点击外部或再次点击关闭面板的遮罩 -->
    <transition name="fade">
      <div v-if="showMenu" class="nav-overlay" @click="showMenu = false"></div>
    </transition>

    <!-- 交互逻辑--左侧聚合面板 -->
    <transition name="slide-panel">
      <div v-if="showMenu" class="nav-expanded-panel">
        <div class="panel-item" @click="handleTabClick('finished', '已看完')">
          <i class="fas fa-check-circle"></i>
          <span>已看完</span>
        </div>
        <div class="panel-divider"></div>
        <div class="panel-item" @click="handleTabClick('favorite', '最喜欢')">
          <i class="fas fa-heart"></i>
          <span>最喜欢</span>
        </div>
        <div class="panel-divider"></div>
        <div class="panel-item" @click="handleTabClick('watching', '正在追')">
          <i class="fas fa-running"></i>
          <span>正在追</span>
        </div>
      </div>
    </transition>

    <!-- 底部三个悬浮岛布局 -->
    <nav class="floating-islands" aria-label="移动端悬浮导航">
      <!-- 左侧岛--菜单触发器 -->
      <div 
        class="island-item island-circle" 
        :class="{ active: showMenu }"
        @click="showMenu = !showMenu"
        role="button"
      >
        <div class="island-glass-bg"></div>
        <i class="fas fa-bars"></i>
      </div>

      <!-- 中间岛--核心功能胶囊 -->
      <div 
        class="island-item island-pill" 
        @click="goToAdmin"
        role="button"
      >
        <div class="island-glass-bg"></div>
        <i class="fas fa-database"></i>
        <span>数据管理</span>
      </div>

      <!-- 右侧岛--“我的”快捷键 -->
      <div 
        class="island-item island-circle" 
        :class="{ active: activeTab === 'settings' && !showMenu }"
        @click="handleTabClick('settings', '我的')"
        role="button"
      >
        <div class="island-glass-bg"></div>
        <i class="fas fa-user"></i>
      </div>
    </nav>
  </div>
</template>

<script setup>
/**
 * @module AppBottomBar
 * @description 处理磨砂玻璃悬浮导航交互逻辑
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  /** 当前激活的Tab页 */
  activeTab: { type: String, default: 'finished' }
});

const emit = defineEmits(['tab-change']);
const router = useRouter();

// 菜单面板显示状态
const showMenu = ref(false);

/**
 * @function handleTabClick
 * @description 切换选项卡并关闭菜单面板
 */
function handleTabClick(key, label) {
  emit('tab-change', { key, label });
  showMenu.value = false;
}

/**
 * @function goToAdmin
 * @description 跳转数据管理
 */
function goToAdmin() {
  showMenu.value = false;
  router.push('/admin');
}
</script>

<style scoped>
/* 默认在大屏隐藏 */
.mobile-nav-container {
  display: none;
}

@media (max-width: 768px) {
  .mobile-nav-container {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 2500;
    pointer-events: none;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .nav-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.05);
    pointer-events: auto;
    z-index: -1;
  }

  /* 悬浮岛容器布局 */
  .floating-islands {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    width: 100%;
    box-sizing: border-box;
  }

  .fx-layer {
    filter: none;
  }

  /* 悬浮岛通用样式 (磨砂玻璃) */
  .island-item {
    pointer-events: auto;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    color: var(--sys-text-primary);
  }

  /* 磨砂玻璃背景层 */
  .island-glass-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    /* 更低的 alpha 值实现强半透明感 */
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    z-index: -1;
    transition: all 0.3s ease;
  }
  .island-circle { width: 56px; height: 56px; }
  .island-circle .island-glass-bg { border-radius: 50%; }
  
  .island-pill { height: 56px; padding: 0 24px; min-width: 140px; }
  .island-pill .island-glass-bg { border-radius: 28px; }

  /* 统一蓝色，确保高可读性 */
  .island-item i {
    color: var(--sys-blue);
    font-size: 20px;
    transition: transform 0.3s ease;
  }

  /* 激活与点击反馈 */
  .island-item:active, .island-item.active {
    transform: scale(0.92);
  }
  
  .island-item:active .island-glass-bg, 
  .island-item.active .island-glass-bg {
    background: rgba(255, 255, 255, 0.9);
  }

  .island-pill span {
    margin-left: 10px;
    font-weight: 700;
    font-size: 15px;
    color: var(--sys-text-primary);
  }

  /* 聚合菜单面板 */
  .nav-expanded-panel {
    pointer-events: auto;
    position: absolute;
    bottom: 90px;
    left: 24px;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    width: 160px;
    overflow: hidden;
    z-index: 2600;
  }

  .panel-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.2s;
    color: var(--sys-text-primary);
  }

  .panel-item:active { background: rgba(0, 0, 0, 0.05); }
  .panel-item i { font-size: 16px; width: 20px; text-align: center; color: var(--sys-blue); }
  .panel-item span { font-size: 14px; font-weight: 600; }
  .panel-divider { height: 1px; background: rgba(0, 0, 0, 0.04); margin: 0 15px; }

  /* 动画过渡 */
  .fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }

  .slide-panel-enter-active, .slide-panel-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .slide-panel-enter-from, .slide-panel-leave-to {
    transform: translateY(20px) scale(0.9);
    opacity: 0;
  }
}
</style>