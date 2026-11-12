const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { _electron: electron } = require('playwright');
const { startFixture } = require('./test-fixture.cjs');

/** 使用独立用户目录验证系统加密与真实 Electron 重启，不访问用户账户。 */
async function main() {
  const fixture = await startFixture({ count: 12 });
  const profile = path.resolve('.temp/qa/preferences-' + Date.now());
  const settingsFile = path.join(profile, 'settings.json');
  await fs.mkdir(profile, { recursive: true });
  await fs.writeFile(settingsFile, JSON.stringify({ serverUrl: fixture.origin }));
  const environment = { ...process.env, LIMANGE_USER_DATA: profile, LIMANGE_TEST_HIDDEN: '1' };
  delete environment.ELECTRON_RUN_AS_NODE;
  const packaged = process.argv.includes('--packaged');
  const errors = [];
  let app;
  let page;

  const readSettings = async () => JSON.parse(await fs.readFile(settingsFile, 'utf8'));
  const username = () => page.getByRole('textbox', { name: '用户名', exact: true });
  const password = () => page.getByRole('textbox', { name: '密码', exact: true });
  const remember = () => page.getByRole('checkbox', { name: '记住密码', exact: true });
  const waitForLogin = () =>
    page.waitForFunction(() => {
      const checkbox = document.querySelector('.remember-password input');
      return checkbox && !checkbox.disabled;
    });

  async function launch() {
    app = await electron.launch({
      executablePath: packaged
        ? path.resolve('release/win-unpacked/limange.exe')
        : require('electron'),
      args: packaged ? [] : ['.'],
      env: environment,
      timeout: 30000
    });
    page = await app.firstWindow();
    page.on('pageerror', (error) => errors.push(error.message));
    await waitForLogin();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].showInactive());
  }

  async function submit() {
    await page.locator('.login-panel').evaluate((form) => form.requestSubmit());
  }

  async function logout() {
    await page.getByRole('button', { name: '退出登录', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click();
    await waitForLogin();
  }

  async function assertFilled() {
    await waitForLogin();
    assert.equal(await username().inputValue(), '记忆测试');
    assert.equal(await password().inputValue(), 'fixture-password');
    assert.equal(await remember().isChecked(), true);
  }

  async function resize(width, height) {
    return app.evaluate(
      ({ BrowserWindow }, size) => {
        const window = BrowserWindow.getAllWindows()[0];
        window.setSize(...size);
        return window.getContentSize();
      },
      [width, height]
    );
  }

  try {
    await launch();
    assert.equal(await remember().isChecked(), false);
    await username().fill('记忆测试');
    await password().fill('wrong-password');
    await remember().check();
    await submit();
    await page.locator('.login-error').waitFor();
    assert.equal((await readSettings()).rememberedLogin, undefined, '失败登录不能保存密码');
    await password().fill('fixture-password');
    await submit();
    await page.locator('.app-sidebar').waitFor();
    const encrypted = (await readSettings()).rememberedLogin;
    assert.equal(typeof encrypted.encrypted, 'string');
    const rawSettings = await fs.readFile(settingsFile, 'utf8');
    assert.ok(!rawSettings.includes('fixture-password') && !rawSettings.includes('记忆测试'));
    assert.ok(
      !(await page.evaluate(() => JSON.stringify(localStorage).includes('fixture-password')))
    );
    await logout();
    await assertFilled();

    await password().fill('wrong-password');
    await submit();
    await page.locator('.login-error').waitFor();
    assert.deepEqual(
      (await readSettings()).rememberedLogin,
      encrypted,
      '错误密码不能覆盖已保存密码'
    );
    await page.reload();
    await assertFilled();
    await page.screenshot({ path: '.temp/qa/remember-login-console.png' });

    await page.getByRole('button', { name: '原生登录', exact: true }).click();
    await page.locator('.scroll-track').first().waitFor();
    await assertFilled();
    await page.screenshot({ path: '.temp/qa/remember-login-native.png' });
    await submit();
    await page.locator('.app-sidebar').waitFor();
    await logout();
    await assertFilled();

    await page.getByRole('button', { name: '服务器设置', exact: true }).click();
    const serverInput = page.getByRole('textbox', { name: '后端服务地址' });
    await serverInput.fill(fixture.origin + '/other');
    await page.getByRole('button', { name: '保存地址', exact: true }).click();
    await page.locator('.server-success').waitFor();
    await waitForLogin();
    assert.equal(await username().inputValue(), '');
    assert.equal(await password().inputValue(), '');
    assert.equal(await remember().isChecked(), false);
    await serverInput.fill(fixture.origin);
    await page.getByRole('button', { name: '保存地址', exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('.login-panel input[type=password]')?.value === 'fixture-password'
    );
    await assertFilled();
    await page.getByRole('button', { name: '关闭服务器设置' }).click();
    await page.getByRole('button', { name: '控制台登录', exact: true }).click();

    const beforeResize = (await readSettings()).windowSize;
    await resize(1000, 700);
    await page.waitForTimeout(2000);
    const [width, height] = await resize(1080, 760);
    await page.waitForTimeout(3300);
    assert.deepEqual((await readSettings()).windowSize, beforeResize, '第二次拉伸必须重新等待五秒');
    await page.waitForTimeout(2000);
    assert.deepEqual((await readSettings()).windowSize, { width, height });
    await page.evaluate(
      (serverUrl) => window.limangeDesktop.setServerUrl(serverUrl),
      fixture.origin
    );
    assert.deepEqual(
      (await readSettings()).windowSize,
      { width, height },
      '保存服务器不能覆盖尺寸'
    );
    await page.evaluate(() => window.limangeDesktop.toggleMaximize());
    await page.waitForTimeout(5300);
    assert.equal(await page.evaluate(() => window.limangeDesktop.isMaximized()), true);
    assert.deepEqual(
      (await readSettings()).windowSize,
      { width, height },
      '最大化不能覆盖普通尺寸'
    );
    await app.close();
    app = null;
    await launch();
    assert.equal(await page.evaluate(() => window.limangeDesktop.isMaximized()), false);
    assert.deepEqual(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentSize()),
      [width, height]
    );
    await assertFilled();

    await submit();
    await page.locator('.app-sidebar').waitFor();
    fixture.state.forceUnauthorized = true;
    await page.getByRole('button', { name: '刷新', exact: true }).click();
    await assertFilled();
    fixture.state.forceUnauthorized = false;
    await remember().uncheck();
    await waitForLogin();
    assert.equal((await readSettings()).rememberedLogin, null);
    await page.reload();
    await waitForLogin();
    assert.equal(await password().inputValue(), '');
    assert.equal(await username().inputValue(), '');

    await username().fill('不记忆测试');
    await password().fill('fixture-password');
    await submit();
    await page.locator('.app-sidebar').waitFor();
    await logout();
    assert.equal(await password().inputValue(), '');
    assert.equal(await remember().isChecked(), false);
    await resize(1120, 780);
    await app.close();
    app = null;
    assert.deepEqual(
      (await readSettings()).windowSize,
      { width, height },
      '五秒内关闭不应提前保存'
    );
    await launch();
    assert.equal(await password().inputValue(), '');
    assert.equal(await remember().isChecked(), false);
    assert.deepEqual(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentSize()),
      [width, height]
    );
    assert.deepEqual(errors, []);
    console.log(
      '偏好回归通过：五秒防抖、最大化排除、重启恢复、系统加密、双登录样式、退出与过期回填、服务隔离、失败登录及取消记忆。'
    );
  } finally {
    if (app) await app.close();
    await fixture.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
