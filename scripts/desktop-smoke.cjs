const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { _electron: electron } = require('playwright');
const { startFixture } = require('./test-fixture.cjs');

async function main() {
  const fixture = await startFixture({ count: 48 });
  const profile = path.resolve('.temp/qa/desktop-' + Date.now());
  await fs.mkdir(profile, { recursive: true });
  await fs.writeFile(
    path.join(profile, 'settings.json'),
    JSON.stringify({ serverUrl: fixture.origin })
  );
  const environment = { ...process.env, LIMANGE_USER_DATA: profile, LIMANGE_TEST_HIDDEN: '1' };
  delete environment.ELECTRON_RUN_AS_NODE;
  const packaged = process.argv.includes('--packaged');
  const executablePath = packaged
    ? path.resolve('release/win-unpacked/limange.exe')
    : require('electron');
  const app = await electron.launch({
    executablePath,
    args: packaged ? [] : ['.'],
    env: environment,
    timeout: 30000
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.text().includes('[Vue warn]') || message.text().includes('Refused to'))
      errors.push(message.text());
  });

  try {
    await page.waitForSelector('.console-login');
    // 原生窗口需要可见的合成表面才能截图；显示但不抢占用户焦点。
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].showInactive());
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
    assert.equal(await page.evaluate(() => typeof window.process), 'undefined');
    assert.equal(await page.evaluate(() => typeof window.limangeDesktop.setServerUrl), 'function');
    assert.equal(await page.evaluate(() => localStorage.getItem('app_server_url')), fixture.origin);
    await page.getByRole('textbox', { name: '用户名', exact: true }).fill('桌面测试');
    await page.getByRole('textbox', { name: '密码', exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.waitForSelector('.app-sidebar');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.anime-card img')]
        .slice(0, 6)
        .every((image) => image.complete && image.naturalWidth > 0)
    );
    assert.ok(
      await page
        .locator('.anime-card img')
        .first()
        .evaluate((image) => image.src.startsWith('blob:') && image.naturalWidth <= 512),
      '桌面自定义协议内也必须成功生成后台缩略图'
    );
    const performanceInfo = await page.evaluate(() => window.limangeDesktop.getPerformanceInfo());
    assert.equal(typeof performanceInfo.gpu.gpu_compositing, 'string');
    console.log('桌面图形状态：', JSON.stringify(performanceInfo));
    assert.ok(
      fixture.state.requests.some(
        (request) => request.path === '/api/anime/main' && request.authorization
      )
    );
    await page.screenshot({ path: '.temp/qa/desktop-library.png' });
    await page.locator('.anime-card').first().click();
    await page.locator('.detail-overlay').waitFor();
    await page.getByRole('button', { name: '最大化', exact: true }).click();
    assert.equal(await page.evaluate(() => window.limangeDesktop.isMaximized()), true);
    const detailBounds = await page.locator('.detail-overlay').boundingBox();
    const titlebarBounds = await page.locator('.titlebar').boundingBox();
    assert.ok(detailBounds.y >= titlebarBounds.y + titlebarBounds.height - 1);
    await page.screenshot({ path: '.temp/qa/desktop-detail-maximized.png' });
    await page.getByRole('button', { name: '还原窗口', exact: true }).click();
    await page.getByRole('button', { name: '返回', exact: true }).click();
    await page.getByRole('tab', { name: '数据管理', exact: true }).click();
    await page.getByRole('button', { name: '全部记录', exact: true }).click();
    await page.locator('.title-cell').first().waitFor();
    await page.reload();
    await page.getByRole('button', { name: '全部记录', exact: true }).click();
    await page.locator('.title-cell').first().waitFor();
    assert.equal(await page.locator('.app-sidebar').count(), 1, '桌面协议刷新应恢复管理工作区');

    await page.evaluate(() => window.limangeDesktop.toggleMaximize());
    assert.equal(await page.evaluate(() => window.limangeDesktop.isMaximized()), true);
    await page.evaluate(() => window.limangeDesktop.toggleMaximize());
    const traversal = await page.evaluate(
      async () => (await fetch('app://limange/%2e%2e%2fpackage.json')).status
    );
    assert.equal(traversal, 404);
    await assert.rejects(
      page.evaluate(() => window.limangeDesktop.setServerUrl('file:///C:/Windows'))
    );

    fixture.state.forceUnauthorized = true;
    await page.getByRole('button', { name: '刷新', exact: true }).click();
    await page.waitForSelector('.console-login');
    assert.equal(await page.evaluate(() => localStorage.getItem('jwt_token')), null);
    fixture.state.forceUnauthorized = false;
    await page.getByRole('button', { name: '服务器设置', exact: true }).click();
    await page.getByRole('textbox', { name: '后端服务地址' }).fill(fixture.origin);
    await page.getByRole('button', { name: '保存地址', exact: true }).click();
    await page.locator('.server-success').waitFor();
    assert.equal(
      JSON.parse(await fs.readFile(path.join(profile, 'settings.json'), 'utf8')).serverUrl,
      fixture.origin
    );
    assert.deepEqual(errors, []);
    console.log(
      `${packaged ? '打包 EXE' : 'Electron'}验证通过：协议加载、隔离、登录、API/图片代理、管理刷新、窗口按钮、路径边界、过期退出与配置保存。`
    );
  } catch (error) {
    console.error('桌面异常：', errors);
    await page.screenshot({ path: '.temp/qa/desktop-failure.png' });
    throw error;
  } finally {
    await app.close();
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
