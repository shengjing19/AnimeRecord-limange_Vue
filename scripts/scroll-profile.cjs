const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { startFixture } = require('./test-fixture.cjs');

/** 生产构建、独立图片 URL、大尺寸源图、冷加载与往返滚动；不依赖用户账户。 */
async function measure(buildDir, label, fixture) {
  const { preview } = await import('vite');
  const server = await preview({
    build: { outDir: buildDir },
    preview: { host: '127.0.0.1', port: 0, open: false }
  });
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined)
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((serverUrl) => {
      localStorage.setItem('app_server_url', serverUrl);
      localStorage.setItem('jwt_token', 'scroll-profile-fixture');
      localStorage.setItem('username', '性能测试');
      localStorage.setItem('app_workspace_appearance', '1');
      localStorage.setItem('app_bg_theme', 'manga');
    }, fixture.origin);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    if (process.env.PERF_CPU_RATE)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.PERF_CPU_RATE) });
    const started = performance.now();
    await page.goto(origin);
    await page.waitForSelector('.anime-card');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.anime-card img')]
        .slice(0, 6)
        .every((image) => image.complete && image.naturalWidth)
    );
    const firstCoversMs = Math.round(performance.now() - started);
    const passes = [];
    for (const [name, direction] of [
      ['cold-down', 1],
      ['return-up', -1],
      ['warm-down', 1]
    ]) {
      const before = Object.fromEntries(
        (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value])
      );
      const result = await page.evaluate(
        async ({ direction }) => {
          const root = document.querySelector('.app-main');
          const frames = [];
          let previous;
          let maxCards = 0;
          let maxPixels = 0;
          let blankVisible = 0;
          let visibleSamples = 0;
          for (let index = 0; index < 240; index++) {
            const now = await new Promise(requestAnimationFrame);
            if (previous) frames.push(now - previous);
            previous = now;
            root.scrollTop += direction * 32;
            if (index % 12 === 0) {
              const images = [...document.querySelectorAll('.anime-card img')];
              const bounds = root.getBoundingClientRect();
              maxCards = Math.max(maxCards, images.length);
              maxPixels = Math.max(
                maxPixels,
                images.reduce((sum, image) => sum + image.naturalWidth * image.naturalHeight, 0)
              );
              for (const image of images) {
                const box = image.getBoundingClientRect();
                if (box.bottom <= bounds.top || box.top >= bounds.bottom) continue;
                visibleSamples++;
                if (!image.complete || !image.naturalWidth) blankVisible++;
              }
            }
          }
          frames.sort((a, b) => a - b);
          return {
            p95FrameMs: +frames[Math.floor(frames.length * 0.95)].toFixed(2),
            over33ms: frames.filter((value) => value > 33.4).length,
            over50ms: frames.filter((value) => value > 50).length,
            maxCards,
            mountedImagePixelMiB: +((maxPixels * 4) / 1048576).toFixed(2),
            blankVisibleRatio: +(blankVisible / Math.max(1, visibleSamples)).toFixed(3)
          };
        },
        { direction }
      );
      const after = Object.fromEntries(
        (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value])
      );
      passes.push({
        name,
        ...result,
        mainThreadTaskMs: +((after.TaskDuration - before.TaskDuration) * 1000).toFixed(1),
        layoutMs: +((after.LayoutDuration - before.LayoutDuration) * 1000).toFixed(1),
        styleMs: +((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000).toFixed(1)
      });
    }
    // 鼠标滚轮走浏览器原生滚动路径，确认最终视口封面均可显示。
    await page.mouse.move(1000, 550);
    await page.mouse.wheel(0, 800);
    await page.waitForFunction(() => {
      const bounds = document.querySelector('.app-main').getBoundingClientRect();
      return [...document.querySelectorAll('.anime-card img')].every((image) => {
        const box = image.getBoundingClientRect();
        return (
          box.bottom <= bounds.top ||
          box.top >= bounds.bottom ||
          (image.complete && image.naturalWidth)
        );
      });
    });
    // 截图会同步阻塞渲染；先结束滚动采样，避免把截图成本计为滚动掉帧。
    await page.waitForTimeout(300);
    await page.screenshot({ path: `.temp/qa/scroll-${label}.png` });
    let diagnostics;
    if (label === 'after') {
      await page.getByRole('button', { name: '设置', exact: true }).click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: '导出性能日志', exact: true }).click()
      ]);
      const logPath = `.temp/qa/scroll-${label}-log.json`;
      await download.saveAs(logPath);
      diagnostics = JSON.parse(await fs.readFile(logPath, 'utf8'));
    }
    assert.deepEqual(errors, []);
    assert.ok(passes.every((pass) => pass.maxCards <= 80));
    assert.ok(passes[0].blankVisibleRatio < 0.06, '冷滚动不能以大量空白占位换取帧率');
    assert.ok(
      passes.slice(1).every((pass) => pass.blankVisibleRatio < 0.01),
      '返回片库应复用已加载封面'
    );
    return { label, firstCoversMs, passes, errors, diagnostics };
  } finally {
    await browser.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  }
}

async function main() {
  await fs.mkdir('.temp/qa', { recursive: true });
  const fixture = await startFixture({
    count: 240,
    originalImages: true,
    uniqueCovers: true,
    largeCovers: true
  });
  try {
    const results = [];
    if (process.argv.includes('--compare'))
      results.push(await measure('.temp/scroll-before-dist', 'before', fixture));
    results.push(await measure('dist', 'after', fixture));
    const report = {
      conditions:
        'Edge headless / production / 1440×900 / 240 records / 21 large images with per-record URLs / 3×240 frames at 32px per frame',
      cpuRate: Number(process.env.PERF_CPU_RATE || 1),
      results
    };
    await fs.writeFile('.temp/qa/scroll-performance.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
