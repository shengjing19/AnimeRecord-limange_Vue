import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLibraryRows, findVisibleRows } from '../src/utils/virtualLibrary.js';

const animes = Array.from({ length: 1200 }, (_, index) => ({ id: index + 1 }));

test('大列表只返回视口附近的行，首尾记录都可到达', () => {
  const layout = buildLibraryRows([{ year: 2026, month: 11, animes }], 1100);
  const first = findVisibleRows(layout.rows, 0, 1500);
  const last = findVisibleRows(layout.rows, layout.height - 1500, layout.height);
  assert.equal(first[1].animes[0].id, 1);
  assert.equal(last.at(-1).animes.at(-1).id, 1200);
  assert.ok(first.flatMap((row) => row.animes || []).length < 50);
  assert.ok(last.flatMap((row) => row.animes || []).length < 50);
});

test('缩放和跨月分组不会遗漏或重复记录', () => {
  for (const width of [150, 600, 1100, 1800]) {
    const layout = buildLibraryRows(
      [{ animes: animes.slice(0, 53) }, { animes: animes.slice(53) }],
      width
    );
    const ids = layout.rows.flatMap((row) => (row.animes || []).map((anime) => anime.id));
    assert.deepEqual(
      ids,
      animes.map((anime) => anime.id)
    );
    assert.ok(
      layout.rows.every(
        (row, index) =>
          index === 0 || row.top >= layout.rows[index - 1].top + layout.rows[index - 1].height
      )
    );
  }
});

test('空列表保留空状态，不创建虚拟占位行', () => {
  assert.equal(buildLibraryRows([{ animes: [] }], 1000).height, 0);
  assert.deepEqual(findVisibleRows([], 0, 900), []);
});
