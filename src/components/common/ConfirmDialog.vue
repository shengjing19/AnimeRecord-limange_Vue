<template>
  <Teleport to="body">
    <div class="global-notify-mask" @click.self="handleCancel">
      <section
        ref="dialogRef"
        class="global-notify-confirm-box"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="contentId"
      >
        <header class="confirm-header">
          <h2 :id="titleId">{{ title }}</h2>
          <button class="icon-button" aria-label="关闭确认框" @click="handleCancel">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <div class="confirm-body">
          <i :class="iconClass" aria-hidden="true"></i>
          <p :id="contentId">{{ content }}</p>
        </div>
        <footer class="confirm-footer">
          <button ref="cancelRef" class="workbench-button btn-cancel" @click="handleCancel">
            {{ cancelText }}
          </button>
          <button
            :class="[
              'workbench-button',
              'btn-confirm',
              type === 'danger' ? 'is-danger' : 'is-primary'
            ]"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  title: { type: String, default: '提示' },
  /** 所有提示按纯文本渲染，保留换行，不接受 HTML。 */
  content: { type: String, default: '确定执行此操作吗？' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  type: {
    type: String,
    default: 'danger',
    validator: (value) => ['info', 'warning', 'danger'].includes(value)
  }
});

const emit = defineEmits(['confirm', 'cancel']);
const dialogRef = ref(null);
const cancelRef = ref(null);
const previousFocus = document.activeElement;
const dialogId = `global-confirm-${Math.random().toString(36).slice(2)}`;
const titleId = `${dialogId}-title`;
const contentId = `${dialogId}-content`;
const iconClass = computed(() => [
  'fa-solid',
  props.type === 'info' ? 'fa-circle-info' : 'fa-triangle-exclamation',
  `is-${props.type}`
]);

function handleCancel() {
  emit('cancel');
}

/** 确认框打开时将键盘焦点留在框内，关闭后回到触发操作。 */
function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    handleCancel();
    return;
  }

  if (event.key !== 'Tab') return;

  const buttons = [...dialogRef.value.querySelectorAll('button:not(:disabled)')];
  const currentIndex = buttons.indexOf(document.activeElement);
  const nextIndex = (currentIndex + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
  event.preventDefault();
  buttons[nextIndex].focus();
}

onMounted(() => {
  cancelRef.value.focus();
  window.addEventListener('keydown', handleKeydown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown, true);
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
});
</script>

<style scoped>
.global-notify-mask {
  position: fixed;
  inset: var(--app-titlebar-height) 0 0;
  z-index: 20000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--overlay);
  backdrop-filter: blur(2px);
}
.global-notify-confirm-box {
  display: flex;
  flex-direction: column;
  width: min(440px, 100%);
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  box-shadow: 0 24px 80px #18233433;
}
.confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}
.confirm-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.confirm-body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 22px 20px;
  min-height: 0;
  overflow-y: auto;
}
.confirm-body > i {
  flex-shrink: 0;
  margin-top: 3px;
  font-size: 16px;
  color: var(--sys-blue);
}
.confirm-body > .is-danger {
  color: var(--danger);
}
.confirm-body > .is-warning {
  color: #9d5d00;
}
.confirm-body p {
  color: var(--sys-text-secondary);
  font-size: 12px;
  line-height: 1.8;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.confirm-footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--panel);
}
.confirm-header,
.confirm-footer {
  flex-shrink: 0;
}
</style>
