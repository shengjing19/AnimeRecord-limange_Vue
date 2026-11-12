const path = require('node:path');

function normalizeServerUrl(value) {
  const url = new URL(String(value).trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('无效的后端地址');
  }
  return url.href.replace(/\/+$/, '').replace(/\/api$/, '');
}

/** URL 解码后再次检查边界，禁止从应用协议读取打包目录外的文件。 */
function resolveAssetPath(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes('\0') || decoded.includes('\\')) throw new Error('无效资源路径');
  const resolved = path.resolve(root, `.${decoded}`);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('资源路径越界');
  return resolved;
}

function isTrustedRenderer(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'app:' && parsed.hostname === 'limange';
  } catch {
    return false;
  }
}

module.exports = { normalizeServerUrl, resolveAssetPath, isTrustedRenderer };
