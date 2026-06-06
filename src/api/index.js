/**
 * limange - api/index.js
 * Axios实例封装，包含请求拦截与认证处理
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';

/** 创建Axios实例 */
const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

/**
 * 判断当前请求是否为匿名认证入口。
 * 登录与系统初始化注册不依赖本地 Token，避免携带过期凭证造成后端误判。
 * @param {string} url - Axios 请求路径
 * @returns {boolean} 是否为匿名认证请求
 */
function isAnonymousAuthRequest(url = '') {
  const normalizedUrl = String(url);
  return ['/auth/login', '/auth/register'].some((path) => normalizedUrl.startsWith(path));
}

/**
 * 请求拦截器：自动注入JWT Token
 */
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token && !isAnonymousAuthRequest(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器：统一处理401未授权
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401 && !isAnonymousAuthRequest(requestUrl)) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('username');
      localStorage.removeItem('is_demo_account');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default http;
