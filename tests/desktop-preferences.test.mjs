import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createSettingsStore } from '../desktop/settings.cjs';
import { getWindowOptions, restoreWindowSize, trackWindowSize } from '../desktop/window-state.cjs';
import { createRememberedLogin } from '../desktop/remembered-login.cjs';

test('并发保存窗口、服务器与密码时合并字段，重启仍能读取', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'limange-preferences-'));
  t.after(() => {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('limange-preferences-'));
    return fs.rm(directory, { recursive: true, force: true });
  });
  const file = path.join(directory, 'settings.json');
  await fs.writeFile(file, JSON.stringify({ serverUrl: 'https://old.example', custom: true }));
  const settings = await createSettingsStore(file);
  await Promise.all([
    settings.update({ windowSize: { width: 1200, height: 800 } }),
    settings.update({ serverUrl: 'https://new.example' }),
    settings.update({ rememberedLogin: { encrypted: 'test-ciphertext' } })
  ]);
  const restored = await createSettingsStore(file);
  assert.deepEqual(restored.get('windowSize'), { width: 1200, height: 800 });
  assert.equal(restored.get('serverUrl'), 'https://new.example');
  assert.equal(restored.get('custom'), true);
  assert.deepEqual(restored.get('rememberedLogin'), { encrypted: 'test-ciphertext' });

  await fs.writeFile(file, '{broken');
  const repaired = await createSettingsStore(file);
  assert.equal(repaired.get('windowSize'), undefined);
  await repaired.update({ serverUrl: 'https://repaired.example' });
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).serverUrl, 'https://repaired.example');
});

test('窗口尺寸兼容首次启动、损坏记录与小屏幕', () => {
  const workArea = { width: 1920, height: 1080 };
  assert.deepEqual(getWindowOptions(undefined, workArea), {
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 620
  });
  assert.equal(getWindowOptions({ width: '1200', height: 800 }, workArea).width, 1440);
  assert.equal(getWindowOptions({ width: -1, height: 800 }, workArea).width, 1440);
  assert.deepEqual(getWindowOptions({ width: 3000, height: 2000 }, { width: 800, height: 600 }), {
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600
  });
});

function fakeWindow() {
  return Object.assign(new EventEmitter(), {
    size: [1000, 700],
    maximized: false,
    minimized: false,
    fullScreen: false,
    destroyed: false,
    getContentSize() {
      return this.size;
    },
    isMaximized() {
      return this.maximized;
    },
    isMinimized() {
      return this.minimized;
    },
    isFullScreen() {
      return this.fullScreen;
    },
    isDestroyed() {
      return this.destroyed;
    }
  });
}

test('拉伸连续五秒无变化才保存，再次拉伸重新计时，关闭不提前保存', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const window = fakeWindow();
  const saved = [];
  trackWindowSize(window, (size) => saved.push(size), assert.fail);
  window.emit('resize');
  t.mock.timers.tick(4999);
  assert.equal(saved.length, 0);
  window.size = [1250, 810];
  window.emit('resize');
  t.mock.timers.tick(4999);
  assert.equal(saved.length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(saved, [{ width: 1250, height: 810 }]);
  t.mock.timers.tick(10000);
  assert.equal(saved.length, 1);
  window.size = [1300, 850];
  window.emit('resize');
  t.mock.timers.tick(1000);
  window.destroyed = true;
  window.emit('closed');
  t.mock.timers.tick(10000);
  assert.equal(saved.length, 1);
});

test('恢复内容区尺寸时校正分数缩放造成的向上取整', () => {
  let size = [0, 0];
  const window = {
    setContentSize: (width, height) => {
      size = [width + 1, height + 1];
    },
    getContentSize: () => size
  };
  restoreWindowSize(window, { width: 1080, height: 760 });
  assert.deepEqual(size, [1080, 760]);
});

test('最大化、最小化和全屏的两种事件顺序均不能写入尺寸', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const [state, event] of [
    ['maximized', 'maximize'],
    ['minimized', 'minimize'],
    ['fullScreen', 'enter-full-screen']
  ]) {
    for (const resizeFirst of [true, false]) {
      const window = fakeWindow();
      const saved = [];
      trackWindowSize(window, (size) => saved.push(size), assert.fail);
      window.emit('resize');
      t.mock.timers.tick(3000);
      window.size = [1920, 1080];
      if (resizeFirst) window.emit('resize');
      window[state] = true;
      window.emit(event);
      if (!resizeFirst) window.emit('resize');
      t.mock.timers.tick(6000);
      assert.deepEqual(saved, []);
      window.emit('closed');
    }
  }
});

test('记住密码调用系统加密、按服务器回填、支持清除并拒绝明文存储降级', async () => {
  const values = {};
  let serverUrl = 'https://one.example';
  let available = true;
  let backend = 'dpapi';
  const ciphertexts = new Map();
  const credentials = { username: '测试账号', password: 'test-password' };
  const remembered = createRememberedLogin({
    settings: { get: (key) => values[key], update: async (patch) => Object.assign(values, patch) },
    getServerUrl: () => serverUrl,
    safeStorage: {
      isEncryptionAvailable: () => available,
      getSelectedStorageBackend: () => backend,
      encryptString(value) {
        const key = 'ciphertext-' + ciphertexts.size;
        ciphertexts.set(key, value);
        return Buffer.from(key);
      },
      decryptString: (value) => ciphertexts.get(value.toString())
    }
  });
  assert.deepEqual(remembered.get(), { available: true, credentials: null });
  await remembered.save({ serverUrl, ...credentials });
  assert.deepEqual(remembered.get().credentials, credentials);
  assert.ok(!JSON.stringify(values).includes(credentials.password));
  assert.ok(!JSON.stringify(values).includes(credentials.username));
  serverUrl = 'https://two.example';
  assert.equal(remembered.get().credentials, null);
  assert.throws(() => remembered.save({ serverUrl: 'https://one.example', ...credentials }));
  serverUrl = 'https://one.example';
  assert.deepEqual(remembered.get().credentials, credentials);
  values.rememberedLogin.encrypted = 'broken';
  assert.equal(remembered.get().credentials, null);
  available = false;
  assert.throws(() => remembered.save({ serverUrl, ...credentials }));
  available = true;
  backend = 'basic_text';
  assert.throws(() => remembered.save({ serverUrl, ...credentials }));
  await remembered.clear();
  assert.equal(values.rememberedLogin, null);
});
