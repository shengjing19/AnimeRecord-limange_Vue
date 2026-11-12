import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import security from '../desktop/security.cjs';

test('后端地址支持局域网及 HTTPS，拒绝文件、脚本和内嵌凭证', () => {
  assert.equal(security.normalizeServerUrl('http://127.0.0.1:8231/api/'), 'http://127.0.0.1:8231');
  assert.equal(
    security.normalizeServerUrl('https://example.com/limange/'),
    'https://example.com/limange'
  );
  for (const value of [
    'file:///etc/passwd',
    'javascript:alert(1)',
    'https://user:password@example.com',
    'https://example.com/?token=abc'
  ]) {
    assert.throws(() => security.normalizeServerUrl(value));
  }
});

test('应用协议不能越过前端产物目录', () => {
  const root = path.resolve('dist');
  assert.equal(security.resolveAssetPath(root, '/assets/app.js'), path.join(root, 'assets/app.js'));
  for (const value of [
    '/../private.json',
    '/%2e%2e/private.json',
    '/assets%5c..%5c..%5cprivate.json',
    '/%00private'
  ]) {
    assert.throws(() => security.resolveAssetPath(root, value));
  }
});

test('窗口 IPC 只信任应用协议的固定来源', () => {
  assert.equal(security.isTrustedRenderer('app://limange/#/login'), true);
  for (const value of ['https://limange/', 'app://limange.evil/', 'file:///index.html', 'invalid'])
    assert.equal(security.isTrustedRenderer(value), false);
});
