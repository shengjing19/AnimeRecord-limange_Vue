const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { startFixture } = require('./test-fixture.cjs');

/** 固定大图、长时间线和连续中断操作，分别报告帧间隔与主线程布局开销。 */
async function main() {
  const baseline = process.argv.includes('--baseline');
  const fixture = await startFixture({ count: 1200, uniqueCovers: true, largeCovers: true });
  const { createServer } = await import('vite');
  const component = path
    .resolve('src/components/stats/AnimeTimelineMode.vue')
    .replaceAll('\\', '/');
  const server = await createServer({
    plugins: baseline
      ? [
          {
            name: 'timeline-baseline',
            enforce: 'pre',
            async load(id) {
              if (id === component)
                return fs.readFile('.temp/qa/AnimeTimelineMode.before.vue', 'utf8');
            }
          }
        ]
      : [],
    server: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api': fixture.origin } }
  });
  let browser;

  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch({
      headless: true,
      channel:
        process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined)
    });
    const page = await browser.newPage({ viewport: { width: 1696, height: 1028 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const groups = Array.from({ length: 120 }, (_, index) => {
      const date = new Date(2026, 10 - index, 1);
      const count = index === 117 ? 4 : index === 118 ? 1 : index === 119 ? 2 : 10;
      return {
        year: `${date.getFullYear()}年`,
        month: `${date.getMonth() + 1}月`,
        count,
        animes: fixture.state.records.slice(index * 10, index * 10 + count)
      };
    });
    groups[116].animes[0] = {
      ...groups[116].animes[0],
      coverImage: `${fixture.origin}/covers/0.jpg?noCors`
    };
    groups[115].animes[0] = {
      ...groups[115].animes[0],
      coverImage: `${fixture.origin}/covers/99.jpg`
    };
    let failTimeline = false;
    let delayTimeline = false;
    await page.route('**/api/anime/main?type=finished', async (route) => {
      if (delayTimeline) await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill(
        failTimeline
          ? { status: 503, json: { message: '测试时间线加载失败' } }
          : { json: { groupedAnimes: groups } }
      );
    });
    await page.addInitScript((url) => {
      localStorage.setItem('app_server_url', url);
      localStorage.setItem('jwt_token', 'timeline-fixture');
      localStorage.setItem('username', '时间线性能测试');
      localStorage.setItem('app_reduce_motion', 'false');
    }, origin);
    await page.goto(origin);
    await page.getByRole('tab', { name: '数据统计', exact: false }).click();
    await page.getByRole('button', { name: '打开时间线模式' }).click();
    await page.locator('.timeline-anime-card.is-active').waitFor();
    await page.waitForTimeout(2000);
    const session = await page.context().newCDPSession(page);
    await session.send('Performance.enable');
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const traceEvents = [];
    if (process.argv.includes('--trace')) {
      session.on('Tracing.dataCollected', ({ value }) => traceEvents.push(...value));
      await session.send('Tracing.start', {
        categories: 'devtools.timeline,disabled-by-default-devtools.timeline',
        options: 'record-as-much-as-possible'
      });
    }

    async function measure(kind) {
      const before = await session.send('Performance.getMetrics');
      const sample = await page.evaluate(
        async ({ kind, labels }) => {
          const frames = [];
          const longTasks = [];
          let previous;
          let frame;
          let mutations = 0;
          const observer = new PerformanceObserver((list) => {
            longTasks.push(...list.getEntries().map((entry) => entry.duration));
          });
          observer.observe({ type: 'longtask' });
          const changes = new MutationObserver((entries) => {
            mutations += entries.length;
          });
          changes.observe(document.querySelector('.timeline-mode-overlay'), {
            attributes: true,
            subtree: true,
            attributeFilter: ['style']
          });
          const tick = (now) => {
            if (previous !== undefined) frames.push(now - previous);
            previous = now;
            frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);

          for (let index = 0; index < 24; index++) {
            if (kind === 'months') {
              const label = labels[index % labels.length];
              [...document.querySelectorAll('.time-node')]
                .find((node) => node.getAttribute('aria-label') === label)
                ?.click();
            } else {
              document.querySelector('.timeline-anime-card[data-flow-index="1"]')?.click();
            }
            await new Promise((resolve) => setTimeout(resolve, 110));
          }
          await new Promise((resolve) => setTimeout(resolve, 900));
          cancelAnimationFrame(frame);
          observer.disconnect();
          changes.disconnect();
          frames.sort((a, b) => a - b);
          return {
            p95FrameMs: +frames[Math.floor(frames.length * 0.95)].toFixed(2),
            maxFrameMs: +Math.max(...frames).toFixed(2),
            framesOver33ms: frames.filter((value) => value > 33.4).length,
            sampledFrames: frames.length,
            longTasks: longTasks.length,
            styleMutations: mutations,
            mountedMonths: document.querySelectorAll('.time-node').length,
            mountedCards: document.querySelectorAll('.timeline-anime-card').length
          };
        },
        { kind, labels: groups.slice(1, 25).map((group) => group.year + group.month) }
      );
      const after = await session.send('Performance.getMetrics');
      for (const name of [
        'LayoutCount',
        'RecalcStyleCount',
        'LayoutDuration',
        'ScriptDuration',
        'TaskDuration'
      ]) {
        const start = before.metrics.find((metric) => metric.name === name)?.value || 0;
        const end = after.metrics.find((metric) => metric.name === name)?.value || 0;
        sample[name] = +(end - start).toFixed(4);
      }
      return sample;
    }

    const months = await measure('months');
    const cards = await measure('cards');
    if (process.argv.includes('--trace')) {
      const completed = new Promise((resolve) => session.once('Tracing.tracingComplete', resolve));
      await session.send('Tracing.end');
      await completed;
      await fs.writeFile('.temp/qa/timeline-trace.json', JSON.stringify({ traceEvents }));
    }
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.waitForTimeout(700);
    if (!baseline) {
      assert.ok(months.mountedMonths <= 15, '月份节点必须限制在可视窗口内');
      assert.ok(cards.mountedCards <= 7, '封面数量不能随列表增长');
      assert.ok(cards.styleMutations < 1000, '动画期间不应每帧由 JS 改写样式');
      assert.ok(cards.LayoutCount < 80, '卡片切换不能逐帧触发布局');
      await page.waitForFunction(() => {
        const image = document.querySelector('.timeline-anime-card.is-active img');
        return image?.complete && image.naturalWidth > 0;
      });
      assert.ok(
        await page
          .locator('.timeline-anime-card.is-active img')
          .evaluate((img) => img.src.startsWith('blob:') && img.naturalWidth <= 768),
        '封面必须使用有界的 Worker 缩图'
      );

      // 连续快速点击后，简介与卡片必须始终指向最后一次选择。
      const expectedTitle = await page
        .locator('.timeline-anime-card.is-active .timeline-card-title')
        .textContent();
      assert.equal(
        await page.locator('.timeline-console-head strong').textContent(),
        expectedTitle
      );
      await page.screenshot({ path: '.temp/qa/timeline-optimized.png' });

      const activeIndex = () =>
        page.locator('.timeline-anime-card.is-active').getAttribute('data-index');
      await page.keyboard.press('End');
      await page.waitForFunction(
        () => document.querySelectorAll('.timeline-anime-card').length === 2
      );
      await page.keyboard.press('ArrowRight');
      assert.equal(await activeIndex(), '1');
      await page.keyboard.press('ArrowRight');
      assert.equal(await activeIndex(), '0');
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction(
        () => document.querySelectorAll('.timeline-anime-card').length === 1
      );
      await page.keyboard.press('ArrowLeft');
      assert.equal(await activeIndex(), '0');
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction(
        () => document.querySelectorAll('.timeline-anime-card').length === 4
      );
      for (let index = 0; index < 9; index++) await page.keyboard.press('ArrowRight');
      assert.equal(await activeIndex(), '1');
      const selected = await page
        .locator('.timeline-anime-card.is-active .timeline-card-title')
        .textContent();
      assert.equal(await page.locator('.timeline-console-head strong').textContent(), selected);

      // Worker 无 CORS 时回退原图；坏图回退本地默认封面。
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction(() => {
        const image = document.querySelector('.timeline-anime-card.is-active img');
        return image?.complete && image.naturalWidth === 1600;
      });
      await page.keyboard.press('ArrowUp');
      await page.waitForFunction(() => {
        const image = document.querySelector('.timeline-anime-card.is-active img');
        return (
          image?.src.endsWith('/img/animerecode.png') && image.complete && image.naturalWidth > 0
        );
      });
      await page.keyboard.press('Home');
      await page.waitForFunction(
        () => document.querySelector('.time-node.is-active')?.dataset.groupIndex === '0'
      );
      const panel = await page.locator('.timeline-panel').boundingBox();
      await page.mouse.move(panel.x + 30, panel.y + panel.height / 2);
      await page.mouse.wheel(0, 100);
      await page.waitForFunction(
        () => document.querySelector('.time-node.is-active')?.dataset.groupIndex === '1'
      );

      for (const width of [800, 480]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(250);
        const current = await page.locator('.time-node.is-active').getAttribute('aria-label');
        const groupIndex = groups.findIndex((group) => group.year + group.month === current);
        const nextLabel = groups[groupIndex + 1].year + groups[groupIndex + 1].month;
        await page.locator('.time-node').filter({ hasText: nextLabel }).click();
        await page.locator('.timeline-anime-card.is-active').waitFor();
      }
      await page.waitForFunction(() =>
        [...document.querySelectorAll('.timeline-anime-card img')].every(
          (img) =>
            img.complete && img.naturalWidth > 0 && !img.classList.contains('is-cover-loading')
        )
      );
      await page.waitForTimeout(400);
      await page.screenshot({ path: '.temp/qa/timeline-mobile.png' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(100);
      assert.equal(
        await page
          .locator('.timeline-mode-overlay')
          .evaluate((root) => root.getAnimations({ subtree: true }).length),
        0
      );
      await page.getByRole('button', { name: '关闭时间线模式' }).click();
      await page.getByRole('button', { name: '打开时间线模式' }).click();
      await page.locator('.timeline-anime-card.is-active').waitFor();
      await page.waitForTimeout(300);
      assert.equal(
        await page
          .locator('.timeline-mode-overlay')
          .evaluate((root) => root.getAnimations({ subtree: true }).length),
        0
      );
      await page.keyboard.press('Escape');
      await page.locator('.timeline-mode-overlay').waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');

      failTimeline = true;
      await page.getByRole('button', { name: '打开时间线模式' }).click();
      await page.locator('.timeline-state-panel.is-error').waitFor();
      failTimeline = false;
      await page.getByRole('button', { name: '重新加载', exact: true }).click();
      await page.locator('.timeline-anime-card.is-active').waitFor();
      await page.keyboard.press('Escape');
      delayTimeline = true;
      await page.getByRole('button', { name: '打开时间线模式' }).click();
      await page.locator('.timeline-state-panel').waitFor();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);
      await page.locator('.timeline-mode-overlay').waitFor({ state: 'hidden' });
    }
    assert.deepEqual(errors, []);
    const result = {
      label: baseline ? 'before' : 'after',
      environment: 'Edge headless / 1696×1028 / 4× CPU / 120 months / 1600px covers',
      months,
      cards,
      errors
    };
    await fs.mkdir('.temp/qa', { recursive: true });
    await fs.writeFile(`.temp/qa/timeline-${result.label}.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser?.close();
    await server.close();
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
