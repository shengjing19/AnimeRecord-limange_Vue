/**
 * limange - helpers.js
 * 通用工具函数
 * by shengjing19(Hisx12123)
 * created 2026-05-31
 */

/**
 * Fisher-Yates 洗牌算法，将数组随机打乱
 * @param {Array} array - 原始数组
 * @returns {Array} 打乱后的新数组
 */
export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 获取安全的属性值，防止原型链污染攻击
 * @param {Object} obj - 目标对象
 * @param {string} key - 属性名
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值或默认值
 */
export function safeGet(obj, key, defaultValue = null) {
  if (obj === null || obj === undefined) return defaultValue;
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : defaultValue;
}
