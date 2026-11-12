const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const { startFixture } = require('./test-fixture.cjs');

/** 验证真实浏览器中的异步回收、坏图、跨域回退及日志持久化，不修改用户数据。 */
async function main() {
  const { createServer } = await import('vite');
  const fixture = await startFixture({ count: 191, originalImages: true, uniqueCovers: true });
  const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined)
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((serverUrl) => {
    localStorage.setItem('app_server_url', serverUrl);
    localStorage.setItem('jwt_token', 'cover-fixture');
    localStorage.setItem('username', '封面测试');
  }, fixture.origin);
  const report = () =>
    page.evaluate(async () =>
      (await import('/src/utils/performanceLog.js')).getPerformanceReport()
    );
  const waitForVisible = () =>
    page.waitForFunction(() => {
      const bounds = document.querySelector('.app-main')?.getBoundingClientRect();
      if (!bounds) return false;
      const images = [...document.querySelectorAll('.anime-card img')];
      return (
        images.length > 0 &&
        images.every((image) => {
          const box = image.getBoundingClientRect();
          return (
            box.bottom <= bounds.top ||
            box.top >= bounds.bottom ||
            (image.complete && image.naturalWidth)
          );
        })
      );
    });
  try {
    await page.goto(origin);
    await waitForVisible();
    assert.ok((await report()).counters.thumbnailsCreated >= 6);
    assert.equal(
      await page
        .locator('.anime-card img')
        .first()
        .evaluate((image) => image.src.startsWith('blob:')),
      true
    );

    // 快速跳到片库两端，强制取消尚未完成的封面并回收虚拟行。
    await page.evaluate(async () => {
      const root = document.querySelector('.app-main');
      for (let index = 0; index < 18; index++) {
        root.scrollTop = index % 2 ? 0 : root.scrollHeight;
        await new Promise(requestAnimationFrame);
      }
    });
    await waitForVisible();
    await page.waitForFunction(async () => {
      const report = (await import('/src/utils/performanceLog.js')).getPerformanceReport();
      return report.gauges.activeCovers === 0 && report.gauges.coverQueue === 0;
    });
    assert.ok((await report()).counters.thumbnailCacheHits > 0);

    // 图像无法解码时显示既有占位图，不能卡住后面的正常封面。
    fixture.state.records[0].coverImage = `${fixture.origin}/covers/404.jpg`;
    await page.getByRole('button', { name: '刷新', exact: true }).click();
    await waitForVisible();
    await page.waitForFunction(
      () =>
        document.querySelector('.anime-card img')?.getAttribute('src') === '/img/animerecode.png'
    );
    assert.ok((await report()).counters.coverErrors >= 1);

    // 不支持 CORS 的图床仍能用普通 img 显示；不要求用户重配已有图床。
    const noCorsUrl = `${fixture.origin}/covers/0.jpg?noCors=1`;
    fixture.state.records[0].coverImage = noCorsUrl;
    await page.getByRole('button', { name: '刷新', exact: true }).click();
    await page.waitForFunction((url) => {
      const image = document.querySelector('.anime-card img');
      return image?.src === url && image.complete && image.naturalWidth;
    }, noCorsUrl);
    assert.ok((await report()).counters.thumbnailFallbacks >= 2);

    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '刷新读数', exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出性能日志', exact: true }).click()
    ]);
    await fs.mkdir('.temp/qa', { recursive: true });
    await download.saveAs('.temp/qa/cover-pipeline-log.json');
    const text = await fs.readFile('.temp/qa/cover-pipeline-log.json', 'utf8');
    assert.ok(
      !text.includes('cover-fixture') &&
        !text.includes(fixture.origin) &&
        !text.includes('封面测试')
    );
    const exported = JSON.parse(text);
    assert.ok(exported.scrollWindows.length && exported.events.length <= 180);
    await page.locator('.performance-settings').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '.temp/qa/performance-settings.png' });

    // 关闭后没有新增样本，清空后没有旧会话；重新开启可恢复采样。
    await page.getByRole('checkbox', { name: '启用诊断' }).uncheck();
    await page.getByRole('button', { name: '清空日志', exact: true }).click();
    await page.getByRole('tab', { name: /^已看完/ }).click();
    await page.locator('.app-main').evaluate((element) => {
      element.scrollTop = 400;
    });
    await page.waitForTimeout(350);
    assert.equal((await report()).scrollWindows.length, 0);
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('checkbox', { name: '启用诊断' }).check();
    await page.getByRole('tab', { name: /^已看完/ }).click();
    await page.locator('.app-main').evaluate((element) => {
      element.scrollTop = 1200;
    });
    await page.waitForFunction(() => !!localStorage.getItem('limange_performance_last'));
    await page.reload();
    await page.getByRole('button', { name: '设置', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '导出上次运行日志' }).isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log(
      '封面与诊断验证通过：191 条记录、后台缩图、快速往返取消、缓存命中、坏图/CORS 回退、队列清空、导出脱敏、开关和上次日志恢复。'
    );
  } catch (error) {
    console.error('诊断状态：', await report());
    console.error(
      '首张封面：',
      await page
        .locator('.anime-card img')
        .first()
        .evaluate((image) => ({
          src: image.src,
          complete: image.complete,
          width: image.naturalWidth
        }))
        .catch(() => null)
    );
    throw error;
  } finally {
    await browser.close();
    await server.close();
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
