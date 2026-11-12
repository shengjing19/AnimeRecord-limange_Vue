/**
 * limange - constants.js
 * 应用全局常量配置
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

import { getServerUrl } from './server';

/** 应用基本信息 */
export const APP_CONFIG = {
  appName: 'limange',
  version: 'v1.1.1',
  releaseDate: '2026-11-12',
  techStack: 'Spring Boot 3.5 + Vue 3 + Electron',
  author: 'Shengjing19(Hisx12123)',
  copyright: '2020-2026 笙箫旧景 All rights reserved',
  github: 'https://github.com/shengjing19/'
};

/**
 * 获取完整图片地址
 * @param {string|null} path - 图片路径
 * @returns {string} 完整URL
 */
export function getFullImageUrl(path) {
  if (!path) return '/img/animerecode.png';
  if (/^https?:\/\//i.test(path)) {
    const serverPrefix = `${getServerUrl()}/`;
    if (window.limangeDesktop && path.startsWith(serverPrefix))
      return `/resource/${path.slice(serverPrefix.length)}`;
    return path;
  }
  if (path.startsWith('blob:') || path.startsWith('data:image/')) return path;
  return window.limangeDesktop
    ? `/resource/${path.replace(/^\/+/, '')}`
    : `${getServerUrl()}/${path.replace(/^\/+/, '')}`;
}

/** TMDB 公开封面使用匹配卡片尺寸的缩略图；详情继续使用原图。 */
export function getCoverImageUrl(path) {
  const full = getFullImageUrl(path);
  return full.replace(/^(https?:\/\/image\.tmdb\.org\/t\/p\/)original\//, '$1w342/');
}
