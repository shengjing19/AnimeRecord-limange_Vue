export const VISIBLE_CARD_RADIUS = 3;
export const VISIBLE_MONTH_RADIUS = 6;

export function wrapTimelineIndex(index, total) {
  return total > 0 ? ((index % total) + total) % total : 0;
}

/** 偶数列表的对侧保留原始方向，保证同一作品不会在两侧重复出现。 */
export function getTimelineOffset(index, activeIndex, total) {
  if (!total) return 0;

  let offset = index - activeIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

export function getTimelineCards(animes, activeIndex) {
  const total = animes.length;
  if (!total) return [];

  const indexes =
    total <= VISIBLE_CARD_RADIUS * 2 + 1
      ? animes.map((_, index) => index)
      : Array.from({ length: VISIBLE_CARD_RADIUS * 2 + 1 }, (_, index) =>
          wrapTimelineIndex(activeIndex + index - VISIBLE_CARD_RADIUS, total)
        );

  return indexes.map((index) => ({
    anime: animes[index],
    index,
    offset: getTimelineOffset(index, activeIndex, total)
  }));
}

/** 月份只保留中心附近的固定窗口；偏移以槽位表示，无需读取 DOM 尺寸。 */
export function getTimelineMonths(groups, activeIndex) {
  const start = Math.max(0, activeIndex - VISIBLE_MONTH_RADIUS);
  const end = Math.min(groups.length, activeIndex + VISIBLE_MONTH_RADIUS + 1);
  return groups.slice(start, end).map((group, index) => ({
    group,
    index: start + index,
    offset: start + index - activeIndex
  }));
}

export function getTimelineCardStyle(offset, viewportWidth) {
  const tier = Math.abs(offset);
  const side = Math.sign(offset);
  const narrow = viewportWidth < 560;
  const tablet = viewportWidth < 980;
  const base = narrow ? 130 : tablet ? 178 : 220;
  const step = narrow ? 52 : tablet ? 72 : 92;
  const depth = narrow ? 70 : tablet ? 105 : 150;
  const perspective = tier <= 1 ? 900 : narrow ? 2800 : tablet ? 5200 : 9000;
  const x = tier ? side * (base + (tier - 1) * step) : 0;
  const y = tier ? (tier - 1) * (narrow ? 12 : 16) + (narrow ? 16 : 18) : tablet ? -6 : -22;
  const z = -tier * depth;
  const scale = tier ? Math.max(narrow ? 0.34 : 0.28, 1 - tier * (narrow ? 0.19 : 0.22)) : 1;

  return {
    transform: `perspective(${perspective}px) translate3d(${x}px, ${y}px, ${z}px) rotateY(${tier ? side * (-30 - tier * 10) : 0}deg) rotate(${side * -2}deg) scale(${scale})`,
    opacity: tier ? Math.max(0, 0.86 - tier * 0.18) : 1,
    zIndex: 1000 - tier * 30
  };
}
