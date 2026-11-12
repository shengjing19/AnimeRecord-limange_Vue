export const CARD_GAP = 18;
export const GROUP_HEADER_HEIGHT = 52;

/** 把月份分组展开为固定高度的行，避免为每张卡片测量 DOM。 */
export function buildLibraryRows(groups, width) {
  const columns = Math.max(1, Math.floor((width + CARD_GAP) / (158 + CARD_GAP)));
  const cardWidth = Math.max(1, (width - (columns - 1) * CARD_GAP) / columns);
  const rowHeight = Math.ceil((cardWidth * 4) / 3 + 67 + CARD_GAP);
  const rows = [];
  let offset = 0;

  for (const [groupIndex, group] of groups.entries()) {
    const animes = Array.isArray(group.animes) ? group.animes : [];
    if (!animes.length) continue;

    rows.push({
      key: `heading-${groupIndex}`,
      kind: 'heading',
      top: offset,
      height: GROUP_HEADER_HEIGHT,
      group
    });
    offset += GROUP_HEADER_HEIGHT;

    for (let index = 0; index < animes.length; index += columns) {
      rows.push({
        key: `row-${groupIndex}-${index}`,
        kind: 'cards',
        top: offset,
        height: rowHeight,
        animes: animes.slice(index, index + columns)
      });
      offset += rowHeight;
    }
    offset += 12;
  }

  return { rows, height: offset, columns, rowHeight };
}

/** 二分定位滚动范围，滚动成本只取决于可见行数。 */
export function findVisibleRows(rows, top, bottom) {
  let low = 0;
  let high = rows.length;

  while (low < high) {
    const middle = (low + high) >>> 1;
    if (rows[middle].top + rows[middle].height < top) low = middle + 1;
    else high = middle;
  }

  const visible = [];
  for (let index = low; index < rows.length && rows[index].top <= bottom; index++)
    visible.push(rows[index]);
  return visible;
}
