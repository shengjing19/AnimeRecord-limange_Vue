/**
 * limange - stores/app.js
 * 应用全局状态管理 (Pinia Store)
 * 管理背景主题等全局偏好
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  /** 背景主题模式 */
  const bgTheme = ref(localStorage.getItem('app_bg_theme') || 'image');

  /**
   * 设置背景主题
   * @param {string} theme - 'image' | 'solid'
   */
  function setBgTheme(theme) {
    bgTheme.value = theme;
    localStorage.setItem('app_bg_theme', theme);
  }

  return {
    bgTheme,
    setBgTheme
  };
});
