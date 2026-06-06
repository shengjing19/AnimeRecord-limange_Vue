/**
 * flexible.js - 移动端自适应适配脚本
 * 方案：动态计算 rem，同时兼容 PC 端固定布局
 * 
 * 原理：
 * 1. 移动端：根据屏幕宽度 / 设计稿宽度(375) 动态调整根字体大小，实现等比例缩放。
 * 2. PC 端：固定根字体大小为 16px，使 rem 效果等同于原生 px，不影响 PC 布局。
 */
(function() {
  const designWidth = 375;
  const baseFontSize = 16;

  function setRem() {
    const screenWidth = document.documentElement.clientWidth;
    
    // 适配临界点，768px (与项目中的媒体查询保持一致)
    if (screenWidth > 768) {
      // PC 端：固定 1rem = 16px
      document.documentElement.style.fontSize = baseFontSize + 'px';
    } else {
      // 移动端：动态缩放
      // 计算公式：当前屏幕宽度 / 设计稿宽度 * 基础字体大小
      let fontSize = (screenWidth / designWidth) * baseFontSize;
      
      // 限制最大缩放比例，防止在大屏幕平板上显示过大
      const maxFontSize = 32; // 对应两倍屏幕宽度
      if (fontSize > maxFontSize) fontSize = maxFontSize;
      
      document.documentElement.style.fontSize = fontSize + 'px';
    }
  }

  // 初始化
  setRem();

  // 监听窗口大小变化
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setRem, 300);
  });

  // 处理部分浏览器（如微信）后退不刷新的问题
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      setRem();
    }
  });
})();
