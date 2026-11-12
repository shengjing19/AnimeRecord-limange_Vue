<template>
  <header class="titlebar">
    <div class="titlebar-brand">
      <img src="/img/app-icon.png" alt="" /><strong>limange</strong
      ><span class="titlebar-divider"></span><span>动漫记录工作台</span>
    </div>
    <div class="titlebar-end">
      <span class="runtime-label"
        >{{ desktop ? 'DESKTOP' : 'WEB' }} <span> / </span> {{ APP_CONFIG.version }}</span
      >
      <template v-if="desktop">
        <button aria-label="最小化" @click="desktop.minimize()">
          <i class="fa-solid fa-minus"></i>
        </button>
        <button :aria-label="maximized ? '还原窗口' : '最大化'" @click="toggleMaximize">
          <i :class="maximized ? 'fa-regular fa-window-restore' : 'fa-regular fa-square'"></i>
        </button>
        <button class="window-close" aria-label="关闭窗口" @click="desktop.close()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </template>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { APP_CONFIG } from '@/utils/constants';

const desktop = window.limangeDesktop;
const maximized = ref(false);
let unsubscribe;

async function toggleMaximize() {
  maximized.value = await desktop.toggleMaximize();
}

onMounted(async () => {
  if (!desktop) return;
  maximized.value = await desktop.isMaximized();
  unsubscribe = desktop.onMaximized((value) => {
    maximized.value = value;
  });
});

onBeforeUnmount(() => unsubscribe?.());
</script>

<style scoped>
.titlebar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  height: 38px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: #f9fafc;
  color: #738093;
  -webkit-app-region: drag;
  user-select: none;
}
.titlebar-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-left: 15px;
  font-size: 10px;
}
.titlebar-brand img {
  width: 17px;
  height: 17px;
  object-fit: contain;
}
.titlebar-brand strong {
  font-size: 11px;
  color: #344157;
  letter-spacing: 0.5px;
}
.titlebar-divider {
  height: 12px;
  width: 1px;
  background: var(--border);
  margin: 0 3px;
}
.titlebar-end {
  display: flex;
  align-items: stretch;
}
.runtime-label {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 18px;
  font-size: 9px;
  letter-spacing: 1px;
}
.runtime-label span {
  color: #c3cad3;
}
.titlebar button {
  -webkit-app-region: no-drag;
  width: 45px;
  border: none;
  border-left: 1px solid #e9edf1;
  background: none;
  color: #718094;
  font-size: 10px;
}
.titlebar button:hover {
  background: #e8edf3;
}
.titlebar .window-close:hover {
  background: #d83345;
  color: white;
}
</style>
