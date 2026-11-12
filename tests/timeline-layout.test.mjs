import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTimelineCards,
  getTimelineMonths,
  getTimelineOffset,
  wrapTimelineIndex
} from '../src/utils/timelineLayout.js';

test('一至两部、奇偶数月份以及首尾循环均不会重复或遗漏当前作品', () => {
  for (const total of [1, 2, 4, 7, 8, 10, 10000]) {
    const animes = Array.from({ length: total }, (_, id) => ({ id }));
    for (const active of [0, 1, Math.floor(total / 2), total - 1].filter(
      (index) => index < total
    )) {
      const cards = getTimelineCards(animes, active);
      assert.equal(cards.length, Math.min(total, 7));
      assert.equal(new Set(cards.map((card) => card.index)).size, cards.length);
      assert.equal(cards.filter((card) => card.offset === 0).length, 1);
      assert.equal(cards.find((card) => card.offset === 0).anime.id, active);
      assert.ok(cards.every((card) => Math.abs(card.offset) <= 3));
    }
  }
});

test('相邻切换保留六张卡片的身份，避免重建整个卡片层', () => {
  const animes = Array.from({ length: 100 }, (_, id) => ({ id }));
  const first = getTimelineCards(animes, 99);
  const next = getTimelineCards(animes, 0);
  assert.equal(first.filter((card) => next.some((item) => item.anime === card.anime)).length, 6);
  assert.equal(getTimelineOffset(99, 0, 100), -1);
  assert.equal(getTimelineOffset(0, 99, 100), 1);
});

test('万个月份的首、中、末窗口最多十三个节点，绝对索引仍可到达两端', () => {
  const groups = Array.from({ length: 10000 }, (_, id) => ({ id }));
  for (const active of [0, 1, 5000, 9999]) {
    const months = getTimelineMonths(groups, active);
    assert.ok(months.length <= 13);
    assert.equal(months.find((month) => month.offset === 0).group.id, active);
    assert.ok(months.every((month) => month.index === month.group.id));
    assert.ok(months.every((month) => Math.abs(month.offset) <= 6));
  }
  assert.equal(getTimelineMonths(groups, 0)[0].index, 0);
  assert.equal(getTimelineMonths(groups, 9999).at(-1).index, 9999);
});

test('空档案不产生虚拟节点，前后导航安全处理空列表', () => {
  assert.deepEqual(getTimelineCards([], 0), []);
  assert.deepEqual(getTimelineMonths([], 0), []);
  assert.equal(wrapTimelineIndex(-1, 0), 0);
  assert.equal(wrapTimelineIndex(-1, 4), 3);
  assert.equal(wrapTimelineIndex(4, 4), 0);
});
