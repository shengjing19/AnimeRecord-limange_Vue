const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { startFixture } = require('./test-fixture.cjs');

/** 使用同一浏览器、视口和原始图片比较滚动；结果只代表本机可重复的合成负载。 */
async function measure(root, label, fixture) {
  const { createServer } = await import('vite');
  const configFile = path.join(root, 'vite.config.js');
  const server = await createServer({
    root,
    configFile,
    server: {
      host: '127.0.0.1',
      port: 0,
      open: false,
      proxy: { '/api': fixture.origin },
      watch: { ignored: ['**/release/**', '**/.temp/**'] }
    }
  });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  if (label === 'before') {
    const constants = path.join(root, 'src/utils/constants.js');
    const source = await fs.readFile(constants, 'utf8');
    await fs.writeFile(
      constants,
      source.replace(
        /export const API_BASE_URL = '[^']+';/,
        `export const API_BASE_URL = '${origin}/api';`
      )
    );
  }
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
      localStorage.setItem('jwt_token', 'benchmark-fixture');
      localStorage.setItem('username', '性能测试');
      localStorage.setItem('app_bg_theme', 'image');
    }, origin);
    const started = performance.now();
    await page.goto(origin);
    await page.waitForSelector('.anime-card');
    const firstCardsMs = performance.now() - started;
    await page.waitForTimeout(1500);
    const result = await page.evaluate(async () => {
      const root = document.querySelector('.app-main');
      const frames = [];
      const longTasks = [];
      const observer = new PerformanceObserver((list) =>
        longTasks.push(...list.getEntries().map((entry) => entry.duration))
      );
      observer.observe({ type: 'longtask' });
      let previous = performance.now();
      let maxCards = 0;
      let maxNodes = 0;
      for (let index = 0; index < 240; index++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        frames.push(now - previous);
        previous = now;
        root.scrollTop += index < 160 ? 115 : -180;
        if (index % 30 === 0) {
          maxCards = Math.max(maxCards, document.querySelectorAll('.anime-card').length);
          maxNodes = Math.max(maxNodes, document.querySelectorAll('*').length);
        }
      }
      observer.disconnect();
      frames.sort((a, b) => a - b);
      return {
        maxCards,
        maxDomNodes: maxNodes,
        p95FrameMs: +frames[Math.floor(frames.length * 0.95)].toFixed(2),
        framesOver33ms: frames.filter((value) => value > 33.4).length,
        longTasks: longTasks.length,
        heapMB: +(performance.memory?.usedJSHeapSize / 1048576).toFixed(2)
      };
    });
    return { label, records: 1200, firstCardsMs: Math.round(firstCardsMs), ...result, errors };
  } finally {
    await browser.close();
    await server.close();
  }
}

async function main() {
  const fixture = await startFixture({ originalImages: true });
  try {
    const results = [];
    const baseline = path.resolve('.temp/baseline');
    if (process.argv.includes('--compare'))
      results.push(await measure(baseline, 'before', fixture));
    results.push(await measure(path.resolve('.'), 'after', fixture));
    await fs.mkdir('.temp/qa', { recursive: true });
    await fs.writeFile(
      '.temp/qa/performance.json',
      JSON.stringify({ browser: 'Edge, headless, 1440 × 900', results }, null, 2)
    );
    console.log(JSON.stringify(results, null, 2));
    if (results.at(-1).maxCards > 80 || results.at(-1).errors.length)
      throw new Error('可见范围渲染回归失败');
  } finally {
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
