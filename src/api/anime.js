/**
 * limange - api/anime.js
 * 动漫数据API接口封装
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

import http from './index';

export const animeApi = {
  /**
   * 获取主页分类列表
   * @param {string} type - 分类类型 (finished|favorite|watching)
   */
  getMainList(type) {
    return http.get(`/anime/main`, { params: { type } });
  },

  /**
   * 获取单条动漫详情
   * @param {number} id - 动漫ID
   */
  getAnimeDetail(id) {
    return http.get(`/anime/${id}`);
  },

  /** 获取统计总览 */
  getStatsMain() {
    return http.get('/anime/main', { params: { type: 'stats' } });
  },

  /** 获取近七天统计 */
  getStatsWeekly() {
    return http.get('/anime/stats/weekly');
  },

  /** 获取年度统计 */
  getStatsAnnual() {
    return http.get('/anime/stats/annual');
  },

  /**
   * 搜索TMDB动漫信息
   * @param {string} query - 搜索关键字
   */
  searchTmdb(query) {
    return http.get('/anime/tmdb/search', { params: { query } });
  },

  /**
   * 获取管理列表（分页）
   * @param {string} type - 列表类型
   * @param {number} page - 页码
   */
  getAdminList(type, page = 1) {
    return http.get('/anime/list', { params: { type, page } });
  },

  /**
   * 添加动漫（FormData上传）
   * @param {FormData} formData
   */
  addAnime(formData) {
    return http.post('/anime/add', formData);
  },

  /**
   * 更新动漫（FormData上传）
   * @param {FormData} formData
   */
  updateAnime(formData) {
    return http.post('/anime/update', formData);
  },

  /**
   * 删除动漫
   * @param {number} id - 动漫ID
   */
  deleteAnime(id) {
    return http.delete(`/anime/${id}`);
  }
};

export const authApi = {
  /**
   * 用户登录
   * @param {string} username
   * @param {string} password
   */
  login(username, password) {
    return http.post('/auth/login', { username, password });
  },

  /**
   * 初始化系统首个用户。
   * 该接口仅在后端 users 表为空时可用，成功后仍需用户重新登录获取 JWT。
   * @param {string} username - 初始化管理员用户名
   * @param {string} password - 初始化管理员明文密码
   */
  register(username, password) {
    return http.post('/auth/register', { username, password });
  }
};

export const demoUserApi = {
  /**
   * 获取当前系统演示账户信息。
   * @returns {Promise<import('axios').AxiosResponse>} 演示账户基础信息
   */
  getDemoUser() {
    return http.get('/demo-user');
  },

  /**
   * 创建演示账户。
   * 后端当前仅允许系统存在一个演示账户，密码仅用于提交，不会回显。
   * @param {string} username - 演示用户名
   * @param {string} password - 演示账户明文密码
   * @returns {Promise<import('axios').AxiosResponse>} 创建后的演示账户基础信息
   */
  createDemoUser(username, password) {
    return http.post('/demo-user', { username, password });
  },

  /**
   * 修改演示账户密码。
   * @param {string} password - 新演示密码
   * @returns {Promise<import('axios').AxiosResponse>} 后端文本提示
   */
  updateDemoPassword(password) {
    return http.put('/demo-user/password', { password });
  },

  /**
   * 删除演示账户。
   * @returns {Promise<import('axios').AxiosResponse>} 后端文本提示
   */
  deleteDemoUser() {
    return http.delete('/demo-user');
  }
};
