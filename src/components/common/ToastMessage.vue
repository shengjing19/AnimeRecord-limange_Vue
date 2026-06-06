<template>
  <!--
    ToastMessage.vue - 全局Toast消息组件
    轻量级消息提示，自动消失
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <Teleport to="body">
    <div :class="['global-notify-message-box', 'show']">
      <i :class="iconClass"></i>
      <span class="content">{{ content }}</span>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** 提示内容 */
  content: { type: String, default: '' },
  /** 提示类型：info|success|error */
  type: { type: String, default: 'info' }
});

/** 根据类型计算图标类名 */
const iconClass = computed(() => {
  const map = {
    info: 'fas fa-info-circle icon-info',
    success: 'fas fa-check-circle icon-success',
    error: 'fas fa-times-circle icon-error'
  };
  return map[props.type] || map.info;
});
</script>

<style>
.global-notify-message-box {
  position: fixed;
  top: 30px;
  left: 50%;
  transform: translate(-50%, -20px);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 14px 24px;
  border-radius: 100px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), inset 0 1px 1px #fff;
  z-index: 20001;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.global-notify-message-box.show {
  opacity: 1;
  transform: translate(-50%, 0);
}

.global-notify-message-box .icon-info { color: var(--sys-text-secondary); font-size: 18px; }
.global-notify-message-box .icon-success { color: #34c759; font-size: 18px; }
.global-notify-message-box .icon-error { color: #ff3b30; font-size: 18px; }

.global-notify-message-box .content {
  color: var(--sys-text-primary);
  font-size: 14px;
  font-weight: 600;
}
</style>
