<template>
  <div class="desktop-app">
    <AppTitlebar />
    <div class="app-route"><router-view /></div>
  </div>
</template>

<script setup>
import { watchEffect } from 'vue';
import AppTitlebar from '@/components/layout/AppTitlebar.vue';
import { useAppStore } from '@/stores/app';

const appStore = useAppStore();

watchEffect(() => {
  document.body.dataset.background = appStore.bgTheme;
  document.body.classList.toggle('theme-solid-color', appStore.bgTheme === 'solid');
  document.body.classList.toggle('reduce-motion', appStore.reduceMotion);
});
</script>
