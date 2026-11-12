const DEFAULT_SIZE = Object.freeze({ width: 1440, height: 920 });
const MIN_SIZE = Object.freeze({ width: 900, height: 620 });
const RESIZE_SAVE_DELAY_MS = 5000;

function isValidSize(size) {
  return (
    Number.isSafeInteger(size?.width) &&
    Number.isSafeInteger(size?.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

/** 只恢复宽高；更换屏幕或缩放比例后，将尺寸约束在当前工作区内。 */
function getWindowOptions(savedSize, workArea) {
  const size = isValidSize(savedSize) ? savedSize : DEFAULT_SIZE;
  const minWidth = Math.min(MIN_SIZE.width, workArea.width);
  const minHeight = Math.min(MIN_SIZE.height, workArea.height);

  return {
    width: Math.max(minWidth, Math.min(size.width, workArea.width)),
    height: Math.max(minHeight, Math.min(size.height, workArea.height)),
    minWidth,
    minHeight
  };
}

/** 分数缩放下 DIP 与物理像素转换会向上取整，校正内容区尺寸以免重启后逐次变大。 */
function restoreWindowSize(window, { width, height }) {
  let requestedWidth = width;
  let requestedHeight = height;

  for (let attempt = 0; attempt < 3; attempt++) {
    window.setContentSize(requestedWidth, requestedHeight);
    const [actualWidth, actualHeight] = window.getContentSize();
    if (actualWidth === width && actualHeight === height) break;
    requestedWidth = Math.max(1, requestedWidth + width - actualWidth);
    requestedHeight = Math.max(1, requestedHeight + height - actualHeight);
  }
}

/** 每次拉伸重新计时；不足五秒即关闭或切换窗口状态时不提前保存。 */
function trackWindowSize(window, saveSize, onError) {
  let timer;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }

  function isNormal() {
    return (
      !window.isDestroyed() &&
      !window.isMaximized() &&
      !window.isMinimized() &&
      !window.isFullScreen()
    );
  }

  function schedule() {
    cancel();
    if (!isNormal()) return;

    timer = setTimeout(() => {
      timer = undefined;
      if (!isNormal()) return;

      const [width, height] = window.getContentSize();
      if (isValidSize({ width, height })) {
        Promise.resolve(saveSize({ width, height })).catch(onError);
      }
    }, RESIZE_SAVE_DELAY_MS);
  }

  const stateEvents = [
    'maximize',
    'unmaximize',
    'minimize',
    'restore',
    'enter-full-screen',
    'leave-full-screen'
  ];
  window.on('resize', schedule);
  stateEvents.forEach((event) => window.on(event, cancel));
  window.once('closed', () => {
    cancel();
    window.removeListener('resize', schedule);
    stateEvents.forEach((event) => window.removeListener(event, cancel));
  });
}

module.exports = { getWindowOptions, restoreWindowSize, trackWindowSize };
