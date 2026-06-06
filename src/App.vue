<template>
  <!--
    App.vue - 应用根组件
    limange Vue 3 前端应用入口
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <router-view v-slot="{ Component }">
    <KeepAlive :include="['HomeView', 'AdminView']">
      <component :is="Component" />
    </KeepAlive>
  </router-view>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';

onMounted(() => {
  // 恢复背景主题
  const savedTheme = localStorage.getItem('app_bg_theme') || 'image';
  if (savedTheme === 'solid') {
    document.body.classList.add('theme-solid-color');
  }
});

onBeforeUnmount(() => {
  // 卸载时清除可能残留的 body class
  document.body.classList.remove('theme-solid-color');
});
</script>
