const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const { startFixture } = require('./test-fixture.cjs');

async function main() {
  const { createServer } = await import('vite');
  const fixture = await startFixture();
  const server = await createServer({
    server: { host: '127.0.0.1', port: 0, open: false, proxy: { '/api': fixture.origin } }
  });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined)
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (log) => {
    if (log.text().includes('[Vue warn]')) errors.push(log.text());
  });
  const output = path.resolve('.temp/qa');
  await fs.mkdir(output, { recursive: true });
  await page.addInitScript((serverUrl) => {
    localStorage.setItem('app_server_url', serverUrl);
  }, origin);

  const tab = (name) => page.getByRole('tab', { name, exact: false });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const activeModal = () => page.locator('.modal-backdrop.show');
  const waitForList = () =>
    page.waitForFunction(
      () => document.querySelector('.table-wrapper')?.getAttribute('aria-busy') === 'false'
    );
  const screenshot = (name) => page.screenshot({ path: path.join(output, name + '.png') });
  async function assertTitlebarClear(selector) {
    const bar = await page.locator('.titlebar').boundingBox();
    const overlay = await page.locator(selector).boundingBox();
    assert.ok(overlay.y >= bar.y + bar.height - 1, `${selector} 必须从窗口栏下方开始`);
    assert.ok(
      await page.locator('.titlebar').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.right - 20, rect.top + 15));
      }),
      '覆盖层不能阻挡窗口栏的点击'
    );
  }

  async function login(username = '测试用户') {
    await page.getByRole('textbox', { name: '用户名', exact: true }).fill(username);
    await page.getByRole('textbox', { name: '密码', exact: true }).fill('fixture-password');
    await page.locator('.login-panel').evaluate((form) => form.requestSubmit());
    await page.waitForSelector('.app-sidebar');
  }

  try {
    await page.goto(origin + '/login');
    await page.waitForSelector('.console-login');
    await screenshot('login-console');
    await button('首次初始化系统？请注册').click();
    await page.locator('.register-panel').waitFor({ state: 'visible' });
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1000, height: 720 },
      { width: 700, height: 760 },
      { width: 480, height: 560 }
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(
        ({ width, height }) => innerWidth === width && innerHeight === height,
        viewport
      );
      // Edge 的窗口尺寸与布局视口异步更新，等待实际表单完成重排。
      await page.waitForFunction(({ width }) => {
        const heading = document.querySelector('.console-form-heading').getBoundingClientRect();
        const form = document.querySelector('.register-panel').getBoundingClientRect();
        return Math.abs(form.x - heading.x) < 1 && form.x >= 0 && form.right <= width;
      }, viewport);
      const { heading, form } = await page.evaluate(() => ({
        heading: document.querySelector('.console-form-heading').getBoundingClientRect().toJSON(),
        form: document.querySelector('.register-panel').getBoundingClientRect().toJSON()
      }));
      assert.ok(Math.abs(form.x - heading.x) < 1, '注册表单必须与标题左对齐，不能继承原生平移动画');
      assert.ok(
        form.x >= 0 && form.x + form.width <= viewport.width,
        `注册输入框不能横向溢出：${JSON.stringify({ viewport, form })}`
      );
      await page.getByRole('textbox', { name: '初始化用户名', exact: true }).fill('初始化测试');
      await page.getByRole('textbox', { name: '初始化密码', exact: true }).fill('fixture-password');
      if (viewport.width === 700) await screenshot('register-narrow');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await screenshot('register-console');
    await button('创建管理员账户').click();
    await page.getByRole('dialog', { name: '确认初始化注册' }).waitFor();
    await assertTitlebarClear('.global-notify-mask');
    await page.getByRole('dialog').getByRole('button', { name: '确定注册' }).click();
    await page.locator('.login-panel').waitFor({ state: 'visible' });
    assert.equal(fixture.state.registered, true);
    await page.getByRole('textbox', { name: '用户名', exact: true }).fill('测试用户');
    await page.getByRole('textbox', { name: '密码', exact: true }).fill('wrong-password');
    await button('登录').click();
    await page.waitForFunction(() =>
      document.querySelector('.login-error')?.textContent.includes('错误')
    );
    assert.ok(
      !fixture.state.requests.find((request) => request.path.endsWith('/auth/login')).authorization
    );
    await login();
    await page.waitForSelector('.anime-card img[src]');
    assert.ok((await page.locator('.anime-card').count()) < 80, '1200 条记录不应同时创建全部卡片');
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.anime-card img')]
        .slice(0, 6)
        .every((image) => image.complete && image.naturalWidth > 0)
    );
    await screenshot('library');
    await page.locator('.anime-card').first().click();
    await page.locator('.detail-poster img').waitFor();
    await assertTitlebarClear('.detail-overlay');
    await screenshot('detail-titlebar');
    assert.equal(
      await page.locator('.detail-flying-poster').count(),
      0,
      '减少动态效果时应直接显示详情'
    );
    await page.locator('.detail-back-btn').click();
    await page.locator('.detail-overlay').waitFor({ state: 'hidden' });

    await page.locator('.app-main').evaluate((element) => {
      element.scrollTop = 5200;
    });
    await page.waitForTimeout(150);
    const previousScroll = await page.locator('.app-main').evaluate((element) => element.scrollTop);
    await tab('数据管理').click();
    await page.locator('.management-tabs').waitFor();
    assert.equal(await page.locator('.management-tabs button').first().innerText(), '添加新番');
    assert.equal(await page.locator('.management-tabs button.active').innerText(), '添加新番');
    await button('检索').click();
    await page.locator('.global-notify-message-box').waitFor();
    const toast = await page.locator('.global-notify-message-box').boundingBox();
    assert.ok(toast.x > 1000 && toast.y > 750, '通知显示在右下角');
    await screenshot('notification');
    await button('关闭通知').click();
    await page.locator('.global-notify-message-box').waitFor({ state: 'hidden' });
    await page.locator('.management-tabs').getByRole('button', { name: '全部记录' }).click();
    await waitForList();
    assert.equal(await page.locator('.app-sidebar').count(), 1);
    assert.equal(await page.locator('.side-nav').count(), 0);
    assert.equal(await page.getByText('返回主页', { exact: true }).count(), 0);
    await screenshot('management');
    await tab('已看完').click();
    await page.waitForFunction(
      (value) => Math.abs(document.querySelector('.app-main').scrollTop - value) < 2,
      previousScroll
    );
    await page.locator('.app-main').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page.waitForFunction(() =>
      [...document.querySelectorAll('.card-title')].some(
        (element) => element.textContent === '测试作品 1200'
      )
    );
    assert.ok((await page.locator('.anime-card').count()) < 80);
    await page.setViewportSize({ width: 1000, height: 720 });
    await page.waitForTimeout(200);
    assert.ok((await page.locator('.anime-card').count()) < 80);
    await page.setViewportSize({ width: 1440, height: 900 });

    await tab('数据管理').click();
    await waitForList();
    await page.locator('.pagination-btn').filter({ hasText: /^2$/ }).click();
    await page.waitForFunction(
      () => document.querySelector('.title-cell')?.textContent === '测试作品 9'
    );
    await page.locator('.pagination-btn').filter({ hasText: /^1$/ }).click();
    await page.waitForFunction(
      () => document.querySelector('.title-cell')?.textContent === '测试作品 1'
    );
    await page.locator('.btn-edit').first().click();
    await activeModal().waitFor();
    await assertTitlebarClear('.edit-drawer-backdrop.show');
    const drawer = await page.locator('.edit-drawer').boundingBox();
    assert.ok(Math.abs(drawer.x + drawer.width - 1440) < 1, '编辑抽屉必须贴右显示');
    assert.ok(Math.abs(drawer.y + drawer.height - 900) < 1, '抽屉高度填满窗口栏下方的工作区');
    await screenshot('edit-drawer');
    await page.keyboard.press('Escape');
    await activeModal().waitFor({ state: 'hidden' });
    assert.ok(
      await page
        .locator('.btn-edit')
        .first()
        .evaluate((el) => el === document.activeElement)
    );
    await page.locator('.btn-edit').first().click();
    await activeModal().waitFor();
    await activeModal().locator('input[type=text]').fill('已更新的作品');
    await activeModal().getByRole('button', { name: '保存修改' }).click();
    await page.waitForFunction(
      () => document.querySelector('.title-cell')?.textContent === '已更新的作品'
    );
    await tab('已看完').click();
    await page.waitForFunction(
      () => document.querySelector('.card-title')?.textContent === '已更新的作品'
    );

    await tab('数据管理').click();
    await page.locator('.management-tabs').getByRole('button', { name: '添加新番' }).click();
    await page.getByPlaceholder('请输入动漫标题进行检索...').fill('新添加的作品');
    await button('检索').click();
    await page.locator('.result-item').first().click();
    await activeModal().waitFor();
    await assertTitlebarClear('.modal-backdrop.show');
    await activeModal().locator('input[type=date]').fill('2026-11-12');
    await screenshot('add-record');
    await activeModal().getByRole('button', { name: '确认保存' }).click();
    await activeModal().waitFor({ state: 'hidden' });
    await waitForList();
    assert.equal(fixture.state.records.length, 1201);
    assert.equal(fixture.state.records.at(-1).title, '新添加的作品');

    await page.locator('.btn-delete').first().click();
    await page.getByRole('dialog', { name: '删除动漫记录' }).waitFor();
    await assertTitlebarClear('.global-notify-mask');
    await screenshot('delete-confirm');
    await page.getByRole('dialog').getByRole('button', { name: '删除记录', exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('.title-cell')?.textContent === '测试作品 2'
    );
    assert.equal(fixture.state.records.length, 1200);

    fixture.state.delayList.favorite = 450;
    await page.locator('.management-tabs').getByRole('button', { name: '最喜欢的动漫' }).click();
    await page.locator('.management-tabs').getByRole('button', { name: '正在追的动漫' }).click();
    await waitForList();
    await page.waitForTimeout(500);
    assert.equal(
      await page.locator('.title-cell').first().textContent(),
      '测试作品 6',
      '较慢的旧响应不能覆盖当前分类'
    );
    fixture.state.failList = true;
    await button('刷新').click();
    await page.locator('.list-error').waitFor();
    fixture.state.failList = false;
    await button('重试').click();
    await page.locator('.list-error').waitFor({ state: 'hidden' });

    await tab('数据统计').click();
    await page.waitForFunction(
      () => document.querySelectorAll('.stats-chart-area canvas').length === 2
    );
    await screenshot('statistics');
    await page.getByRole('button', { name: '打开时间线模式' }).click();
    await page.locator('.timeline-anime-card').first().waitFor();
    await assertTitlebarClear('.timeline-mode-overlay');
    await screenshot('timeline-titlebar');
    assert.ok((await page.locator('.timeline-anime-card').count()) <= 7);
    await page.getByRole('button', { name: '关闭时间线模式' }).click();
    await page.locator('.timeline-mode-overlay').waitFor({ state: 'hidden' });
    await button('设置').click();
    await page.locator('.appearance-settings').waitFor();
    await screenshot('settings');
    const demo = page.locator('.demo-account-box');
    await demo.getByLabel('演示用户名').fill('访客测试');
    await demo.getByLabel('演示密码', { exact: true }).fill('fixture-password');
    const appearanceBounds = await page.locator('.appearance-settings').boundingBox();
    const demoBounds = await demo.boundingBox();
    assert.ok(
      Math.abs(appearanceBounds.width - demoBounds.width) < 1,
      '演示账户与其他设置卡片等宽'
    );
    await demo.scrollIntoViewIfNeeded();
    await screenshot('settings-demo-create');
    await button('开启演示账户').click();
    await demo.getByLabel('新演示密码').waitFor();
    assert.equal(fixture.state.demoUser.username, '访客测试');
    await demo.getByLabel('新演示密码').fill('fixture-password-new');
    await button('修改密码').click();
    await page.waitForFunction(() => document.querySelector('.demo-field input')?.value === '');
    await demo.scrollIntoViewIfNeeded();
    await screenshot('settings-demo-manage');
    await button('删除演示账户').click();
    await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
    await demo.getByLabel('演示用户名').waitFor();
    assert.equal(fixture.state.demoUser, null);
    await page.getByRole('button', { name: '纯净白色' }).click();
    assert.equal(await page.evaluate(() => document.body.dataset.background), 'solid');
    await page.getByRole('button', { name: '漫画纸感' }).click();
    await page.getByRole('button', { name: /原生登录 熟悉/ }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem('app_login_style')), 'native');
    await button('关于应用').click();
    await page.locator('.about-app').waitFor();
    await screenshot('about');
    assert.match(await page.locator('.about-app').innerText(), /Web 浏览器/);
    assert.equal(await page.getByText('生产环境依赖', { exact: true }).count(), 0);
    await button('退出登录').click();
    await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click();
    await page.waitForSelector('.login-page:not(.console-login)');
    await page.waitForSelector('.scroll-track');
    await screenshot('login-native');
    await page.reload();
    await page.waitForSelector('.login-page:not(.console-login)');
    await login('演示账户');
    await tab('数据管理').click();
    await waitForList();
    assert.equal(await page.locator('.btn-edit,.btn-delete').count(), 0);
    assert.equal(
      await page.locator('.management-tabs').getByRole('button', { name: '添加新番' }).count(),
      0
    );
    assert.match(await page.locator('.sidebar-user').textContent(), /演示账户/);
    await page.goto(origin + '/admin');
    await page.locator('.management-tabs').waitFor();
    assert.equal(await page.locator('.app-sidebar').count(), 1);
    fixture.state.forceUnauthorized = true;
    await button('刷新').click();
    await page.waitForSelector('.login-page');
    assert.equal(await page.evaluate(() => localStorage.getItem('jwt_token')), null);

    assert.deepEqual(errors, [], '浏览器不能存在未处理异常或 Vue 警告');
    console.log(
      '界面回归通过：双登录、1200 条虚拟片库、滚动恢复、分页、增删改、请求竞争、错误重试、统计、偏好持久化、演示账户、旧链接与登录过期。'
    );
  } catch (error) {
    await screenshot('failure');
    console.error('浏览器异常：', errors);
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
