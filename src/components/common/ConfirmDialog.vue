<template>
  <!--
    ConfirmDialog.vue - 确认对话框组件
    全局确认弹窗，用于删除/退出等危险操作前的二次确认
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <Teleport to="body">
    <div class="global-notify-mask" :class="{ show: showClass }" @click.self="handleCancel">
      <div
        class="global-notify-confirm-box"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="contentId"
      >
        <div class="modal-header">
          <span :id="titleId" class="title">{{ title }}</span>
          <button
            type="button"
            class="close-icon"
            title="关闭"
            aria-label="关闭确认框"
            @click="handleCancel"
          >
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div class="modal-body">
          <i :class="iconClass" aria-hidden="true"></i>
          <span :id="contentId" class="content">{{ content }}</span>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="handleCancel">{{ cancelText }}</button>
          <button type="button" :class="['btn-confirm', confirmClass]" @click="handleConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  /** 确认框标题 */
  title: { type: String, default: '提示' },
  /** 确认提示内容，按纯文本渲染，禁止 HTML 注入 */
  content: { type: String, default: '确定执行此操作吗？' },
  /** 确认按钮文案 */
  confirmText: { type: String, default: '确定' },
  /** 取消按钮文案 */
  cancelText: { type: String, default: '取消' },
  /** 弹窗类型：info|warning|danger */
  type: {
    type: String,
    default: 'danger',
    validator: (value) => ['info', 'warning', 'danger'].includes(value)
  }
});

const emit = defineEmits(['confirm', 'cancel']);

/** 控制入场动画的 class */
const showClass = ref(false);

/** 弹窗唯一ID，用于建立可访问性标题与内容关联 */
const dialogId = `global-confirm-${Math.random().toString(36).slice(2)}`;
const titleId = `${dialogId}-title`;
const contentId = `${dialogId}-content`;

/** 根据弹窗类型映射图标 */
const iconClass = computed(() => {
  const map = {
    info: 'fas fa-info-circle icon-info',
    warning: 'fas fa-exclamation-triangle icon-warning',
    danger: 'fas fa-question-circle icon-question'
  };
  return map[props.type] || map.danger;
});

/** 根据弹窗类型映射确认按钮样式 */
const confirmClass = computed(() => `is-${props.type}`);

onMounted(() => {
  // 延迟一帧添加 .show，让浏览器先绘制初始状态再触发 CSS transition
  requestAnimationFrame(() => {
    showClass.value = true;
  });
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  emit('cancel');
}

/**
 * 键盘可访问性处理：Esc 等价于取消，避免用户在弹窗中失去退出路径。
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeydown(event) {
  if (event.key === 'Escape') {
    handleCancel();
  }
}
</script>

<style>
.global-notify-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 20000;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.global-notify-mask.show {
  opacity: 1;
}

.global-notify-confirm-box {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: saturate(180%) blur(40px);
  -webkit-backdrop-filter: saturate(180%) blur(40px);
  width: 420px;
  max-width: 90%;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), inset 0 1px 1px #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: scale(0.9) translateY(10px);
  opacity: 0;
  transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275),
              opacity 0.25s ease;
}

.global-notify-mask.show .global-notify-confirm-box {
  transform: scale(1) translateY(0);
  opacity: 1;
}

.global-notify-confirm-box .modal-header {
  padding: 18px 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.global-notify-confirm-box .modal-header .title {
  font-size: 16px;
  color: var(--sys-text-primary);
  font-weight: 700;
}

.global-notify-confirm-box .close-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--sys-text-secondary);
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.global-notify-confirm-box .close-icon:hover,
.global-notify-confirm-box .close-icon:focus-visible {
  color: #ff3b30;
  transform: rotate(90deg);
  outline: none;
}

.global-notify-confirm-box .modal-body {
  padding: 30px 25px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 15px;
  color: var(--sys-text-primary);
  font-weight: 500;
}

.global-notify-confirm-box .icon-question {
  color: var(--sys-blue);
  font-size: 24px;
  flex: 0 0 auto;
}

.global-notify-confirm-box .icon-info {
  color: var(--sys-blue);
  font-size: 24px;
  flex: 0 0 auto;
}

.global-notify-confirm-box .icon-warning {
  color: #ff9500;
  font-size: 24px;
  flex: 0 0 auto;
}

.global-notify-confirm-box .content {
  white-space: pre-line;
  word-break: break-word;
  line-height: 1.65;
}

.global-notify-confirm-box .modal-footer {
  padding: 10px 25px 25px;
  text-align: right;
}

.global-notify-confirm-box .btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  color: var(--sys-text-primary);
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  margin-right: 10px;
  transition: 0.2s;
  font-size: 14px;
  font-weight: 600;
}

.global-notify-confirm-box .btn-cancel:hover {
  background: rgba(0, 0, 0, 0.1);
}

.global-notify-confirm-box .btn-confirm {
  background: #ff3b30;
  border: none;
  color: #fff;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  transition: 0.2s;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 10px rgba(255, 59, 48, 0.3);
}

.global-notify-confirm-box .btn-confirm.is-warning {
  background: #ff9500;
  box-shadow: 0 4px 10px rgba(255, 149, 0, 0.3);
}

.global-notify-confirm-box .btn-confirm.is-info {
  background: var(--sys-blue);
  box-shadow: 0 4px 10px rgba(0, 122, 255, 0.25);
}

.global-notify-confirm-box .btn-confirm:hover,
.global-notify-confirm-box .btn-confirm:focus-visible {
  background: #d32f2f;
  transform: translateY(-1px);
  outline: none;
}

.global-notify-confirm-box .btn-confirm.is-warning:hover,
.global-notify-confirm-box .btn-confirm.is-warning:focus-visible {
  background: #d98000;
}

.global-notify-confirm-box .btn-confirm.is-info:hover,
.global-notify-confirm-box .btn-confirm.is-info:focus-visible {
  background: #005ecb;
}

@media (max-width: 768px) {
  .global-notify-confirm-box {
    width: min(360px, calc(100vw - 32px));
    border-radius: 16px;
  }

  .global-notify-confirm-box .modal-header {
    padding: 16px 18px;
  }

  .global-notify-confirm-box .modal-body {
    padding: 24px 18px;
    font-size: 14px;
  }

  .global-notify-confirm-box .modal-footer {
    padding: 8px 18px 20px;
    display: flex;
    gap: 10px;
  }

  .global-notify-confirm-box .btn-cancel,
  .global-notify-confirm-box .btn-confirm {
    flex: 1;
    margin-right: 0;
    padding: 11px 12px;
  }
}
</style>
