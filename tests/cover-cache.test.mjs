import test from 'node:test';
import assert from 'node:assert/strict';
import { CoverCache } from '../src/utils/coverCache.js';
import { summarizeFrames } from '../src/utils/performanceMetrics.js';

test('缓存超预算时仅回收未被卡片占用的最旧资源，重复释放没有副作用', () => {
  const disposed = [];
  const cache = new CoverCache(20, (url) => disposed.push(url));
  cache.put('a', { url: 'blob:a', bytes: 15 });
  const first = cache.acquire('a');
  cache.put('b', { url: 'blob:b', bytes: 15 });
  const second = cache.acquire('b');
  cache.trim();
  assert.deepEqual(disposed, []);
  first.release();
  first.release();
  assert.deepEqual(disposed, ['blob:a']);
  assert.equal(cache.bytes, 15);
  assert.equal(cache.acquire('a'), null);
  second.release();
});

test('刷新率估算可识别 120Hz 掉帧，并报告长卡顿', () => {
  const summary = summarizeFrames([...Array(98).fill(8.33), 25, 75]);
  assert.equal(summary.estimatedFrameBudgetMs, 8.33);
  assert.equal(summary.slowFrames, 2);
  assert.equal(summary.over50Ms, 1);
  assert.equal(summary.p95Ms, 8.33);
  assert.equal(summarizeFrames([]), null);
});

test('即使图片很小，缓存条目数也受上限约束', () => {
  const disposed = [];
  const cache = new CoverCache(1000, (url) => disposed.push(url), 2);
  for (const name of ['a', 'b', 'c']) cache.put(name, { url: name, bytes: 1 });
  cache.trim();
  assert.equal(cache.entries.size, 2);
  assert.deepEqual(disposed, ['a']);
});
