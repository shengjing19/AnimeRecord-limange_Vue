/**
 * limange - stores/auth.js
 * 认证状态管理 (Pinia Store)
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

import { defineStore } from 'pinia';
import { computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  /** 获取存储的Token */
  const token = computed(() => localStorage.getItem('jwt_token'));

  /** 获取存储的用户名 */
  const username = computed(() => localStorage.getItem('username') || 'User');

  /** 当前账号是否为演示账户 */
  const isDemo = computed(() => localStorage.getItem('is_demo_account') === 'true');

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!token.value);

  /**
   * 验证登录状态
   * @returns {string|null} Token或null
   */
  function checkLogin() {
    const t = token.value;
    if (!t) return null;
    return t;
  }

  /**
   * 设置登录凭证
   * @param {string} t - JWT Token
   * @param {string} name - 用户名
   * @param {boolean} demo - 是否为演示账户
   */
  function setAuth(t, name, demo = false) {
    localStorage.setItem('jwt_token', t);
    localStorage.setItem('username', name);
    localStorage.setItem('is_demo_account', demo ? 'true' : 'false');
  }

  /** 登出：清除凭证并跳转登录页 */
  function logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_demo_account');
    window.location.href = '/login';
  }

  return {
    token,
    username,
    isDemo,
    isLoggedIn,
    checkLogin,
    setAuth,
    logout
  };
});
