<template>
  <Teleport to="body">
    <div class="global-notify-message-box" :role="type === 'error' ? 'alert' : 'status'">
      <i :class="iconClass" aria-hidden="true"></i>
      <span class="content">{{ content }}</span>
      <button class="icon-button" aria-label="关闭通知" @click="emit('close')">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  content: { type: String, default: '' },
  type: { type: String, default: 'info' }
});
const emit = defineEmits(['close']);
const iconClass = computed(() => {
  const icons = {
    info: 'fa-circle-info',
    success: 'fa-circle-check',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-xmark'
  };
  return ['fa-solid', icons[props.type] || icons.info, `is-${props.type}`];
});
</script>

<style scoped>
.global-notify-message-box {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 20001;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
  max-height: calc(100% - var(--app-titlebar-height) - 32px);
  overflow-y: auto;
  padding: 14px 12px 14px 16px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--ink);
  box-shadow: 0 12px 40px #18233426;
}
.global-notify-message-box > i {
  margin-top: 4px;
  font-size: 15px;
  color: var(--sys-blue);
}
.global-notify-message-box > .is-success {
  color: #107c10;
}
.global-notify-message-box > .is-error {
  color: var(--danger);
}
.global-notify-message-box > .is-warning {
  color: #9d5d00;
}
.content {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.8;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
.icon-button {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
}
</style>
