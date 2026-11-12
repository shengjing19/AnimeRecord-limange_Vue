import defaults from '../../shared/defaults.json';

/** 地址保存在本机；桌面版通过同源代理访问后端，保留正常的 TLS 校验。 */
export const DEFAULT_SERVER_URL = defaults.serverUrl;

export function normalizeServerUrl(value) {
  const url = new URL(String(value).trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('请输入有效的 HTTP 或 HTTPS 后端地址，不要包含账号、参数或片段。');
  }
  return url.href.replace(/\/+$/, '').replace(/\/api$/, '');
}

export function getServerUrl() {
  try {
    return normalizeServerUrl(localStorage.getItem('app_server_url') || DEFAULT_SERVER_URL);
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export function getApiBaseUrl() {
  return window.limangeDesktop ? '/api' : `${getServerUrl()}/api`;
}

export async function saveServerUrl(value) {
  const normalized = normalizeServerUrl(value);
  if (window.limangeDesktop) await window.limangeDesktop.setServerUrl(normalized);
  localStorage.setItem('app_server_url', normalized);
  return normalized;
}
