const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { net } = require('electron');
const { resolveAssetPath } = require('./security.cjs');

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: http: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: http:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-src 'none'"
].join('; ');

/** 桌面应用使用稳定的同源协议，安装版与便携版都不依赖本地 HTTP 服务。 */
function createProtocolHandler({ rendererRoot, getServerUrl }) {
  return async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'limange') return new Response('Forbidden', { status: 403 });

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/resource/')) {
      const suffix = url.pathname.startsWith('/resource/')
        ? url.pathname.slice('/resource'.length)
        : url.pathname;
      const headers = new Headers();
      for (const name of [
        'authorization',
        'content-type',
        'accept',
        'if-none-match',
        'if-modified-since'
      ]) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }

      try {
        const response = await fetch(`${getServerUrl()}${suffix}${url.search}`, {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]),
          redirect: 'error'
        });
        const responseHeaders = new Headers(response.headers);
        // fetch 已完成解压，不能把原始长度与编码再传给 Chromium。
        for (const name of [
          'content-encoding',
          'content-length',
          'transfer-encoding',
          'set-cookie'
        ])
          responseHeaders.delete(name);
        if (url.pathname.startsWith('/api/')) responseHeaders.set('cache-control', 'no-store');
        return new Response(response.body, { status: response.status, headers: responseHeaders });
      } catch (error) {
        const timedOut = error.name === 'TimeoutError';
        return Response.json(
          {
            message: timedOut
              ? '后端连接超时，请检查服务器地址。'
              : '无法连接后端服务，请检查服务器地址和网络。'
          },
          { status: timedOut ? 504 : 502 }
        );
      }
    }

    try {
      const filePath = resolveAssetPath(
        rendererRoot,
        url.pathname === '/' ? '/index.html' : url.pathname
      );
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) return new Response('Not found', { status: 404 });

      const response = await net.fetch(pathToFileURL(filePath).href);
      const headers = new Headers(response.headers);
      headers.set('content-security-policy', CONTENT_SECURITY_POLICY);
      headers.set('x-content-type-options', 'nosniff');
      headers.set(
        'cache-control',
        url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      );
      const extension = path.extname(filePath);
      const mimeTypes = {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.svg': 'image/svg+xml'
      };
      if (mimeTypes[extension])
        headers.set('content-type', `${mimeTypes[extension]}; charset=utf-8`);
      return new Response(response.body, { headers });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  };
}

module.exports = { createProtocolHandler };
