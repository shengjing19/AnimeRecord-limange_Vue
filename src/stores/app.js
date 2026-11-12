import { defineStore } from 'pinia';
import { ref } from 'vue';

function readChoice(key, choices, fallback) {
  const value = localStorage.getItem(key);
  return choices.includes(value) ? value : fallback;
}

/** 仅保存外观偏好；凭证仍由认证模块管理。 */
export const useAppStore = defineStore('app', () => {
  const migrated = localStorage.getItem('app_workspace_appearance') === '1';
  const bgTheme = ref(
    migrated ? readChoice('app_bg_theme', ['manga', 'solid', 'image'], 'manga') : 'manga'
  );
  const loginStyle = ref(readChoice('app_login_style', ['native', 'console'], 'console'));
  const reduceMotion = ref(localStorage.getItem('app_reduce_motion') !== 'false');

  if (!migrated) {
    localStorage.setItem('app_bg_theme', 'manga');
    localStorage.setItem('app_workspace_appearance', '1');
  }

  function setBgTheme(value) {
    if (!['manga', 'solid', 'image'].includes(value)) return;
    bgTheme.value = value;
    localStorage.setItem('app_bg_theme', value);
  }

  function setLoginStyle(value) {
    if (!['native', 'console'].includes(value)) return;
    loginStyle.value = value;
    localStorage.setItem('app_login_style', value);
  }

  function setReduceMotion(value) {
    reduceMotion.value = Boolean(value);
    localStorage.setItem('app_reduce_motion', String(reduceMotion.value));
  }

  return { bgTheme, loginStyle, reduceMotion, setBgTheme, setLoginStyle, setReduceMotion };
});
