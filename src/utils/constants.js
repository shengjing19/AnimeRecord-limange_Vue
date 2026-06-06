/**
 * limange - constants.js
 * 应用全局常量配置
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

/** 应用基本信息 */
export const APP_CONFIG = {
  appName: 'limange',
  version: 'v1.0.1(Release)',
  releaseDate: '2026-06-06',
  techStack: 'Spring Boot 3.5 + Vue 3',
  author: 'Shengjing19(Hisx12123)',
  copyright: '2020-2026 笙箫旧景 All rights reserved',
  github: 'https://github.com/shengjing19/'
};

/** 后端API地址 */
export const API_BASE_URL = 'http://127.0.0.1:8231/api';

/** 图片资源地址 */
export const RESOURCE_BASE_URL = 'http://127.0.0.1:8231/';

/**
 * 获取完整图片地址
 * @param {string|null} path - 图片路径
 * @returns {string} 完整URL
 */
export function getFullImageUrl(path) {
  if (!path) return 'img/default.png';
  if (path.startsWith('http')) return path;
  return RESOURCE_BASE_URL + path;
}
