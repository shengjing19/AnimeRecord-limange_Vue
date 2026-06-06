/**
 * limange - composables/useNotify.js
 * 全局消息通知组合式函数 (确认对话框 + Toast消息)
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

import { createApp, h } from 'vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ToastMessage from '@/components/common/ToastMessage.vue';

/** 全局Toast实例管理 */
let toastInstance = null;
let toastTimer = null;

/**
 * 显示Toast消息
 * @param {Object} options - { content, type, duration }
 */
function showMessage(options = {}) {
  const { content = '', type = 'info', duration = 3000 } = options;

  // 清除上一个Toast
  if (toastTimer) clearTimeout(toastTimer);
  if (toastInstance) {
    toastInstance.unmount();
    toastInstance = null;
  }

  const mountNode = document.createElement('div');
  document.body.appendChild(mountNode);

  toastInstance = createApp({
    render() {
      return h(ToastMessage, {
        content,
        type
      });
    }
  });

  toastInstance.mount(mountNode);

  toastTimer = setTimeout(() => {
    if (toastInstance) {
      toastInstance.unmount();
      document.body.removeChild(mountNode);
      toastInstance = null;
    }
  }, duration);
}

/**
 * 显示确认对话框
 * @param {Object} options - { title, content, confirmText, cancelText, type }
 * @returns {Promise<boolean>} 用户选择结果
 */
function showConfirm(options = {}) {
  const {
    title = '提示',
    content = '确定执行此操作吗？',
    confirmText = '确定',
    cancelText = '取消',
    type = 'danger'
  } = options;

  return new Promise((resolve) => {
    const mountNode = document.createElement('div');
    document.body.appendChild(mountNode);

    const app = createApp({
      render() {
        return h(ConfirmDialog, {
          title,
          content,
          confirmText,
          cancelText,
          type,
          onConfirm: () => {
            cleanup(true);
          },
          onCancel: () => {
            cleanup(false);
          }
        });
      }
    });

    function cleanup(result) {
      app.unmount();
      if (mountNode.parentNode) {
        mountNode.parentNode.removeChild(mountNode);
      }
      resolve(result);
    }

    app.mount(mountNode);
  });
}

/**
 * 通知组合式函数
 * @returns {{ message, confirm }}
 */
export function useNotify() {
  return {
    message: showMessage,
    confirm: showConfirm
  };
}
