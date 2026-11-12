const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

/** 仅供自动化验证的独立服务；测试不会访问用户的 Newlimange 数据。 */
async function startFixture({
  count = 1200,
  originalImages = false,
  uniqueCovers = false,
  largeCovers = false
} = {}) {
  const state = {
    records: [],
    requests: [],
    failMain: false,
    failList: false,
    delayList: {},
    delayMain: {},
    forceUnauthorized: false,
    registered: false,
    demoUser: null
  };
  let images = await Promise.all(
    Array.from({ length: 21 }, (_, index) =>
      fs.readFile(
        path.join(
          __dirname,
          '..',
          originalImages
            ? `public/img/anime/${index + 1}.jpg`
            : `public/img/login/${index + 1}.webp`
        )
      )
    )
  );
  if (largeCovers) {
    const sharp = require('sharp');
    images = await Promise.all(
      images.map((buffer) => sharp(buffer).resize({ width: 1600 }).jpeg({ quality: 88 }).toBuffer())
    );
    originalImages = true;
  }
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader('access-control-allow-headers', '*');
    response.setHeader('access-control-allow-methods', '*');
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    const send = (data, status = 200) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(data));
    };
    state.requests.push({
      path: url.pathname,
      query: url.search,
      method: request.method,
      authorization: Boolean(request.headers.authorization)
    });
    if (url.pathname.startsWith('/covers/')) {
      if (url.searchParams.has('noCors')) response.removeHeader('access-control-allow-origin');
      const index = Number(url.pathname.split('/').pop().split('.')[0]);
      if (!Number.isInteger(index) || index < 0 || index > 20) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'content-type': originalImages ? 'image/jpeg' : 'image/webp',
        'cache-control': 'public, max-age=3600'
      });
      response.end(images[index]);
      return;
    }
    let body = '';
    for await (const chunk of request) body += chunk;
    let data = {};
    if (request.headers['content-type']?.includes('application/json'))
      data = JSON.parse(body || '{}');
    else
      for (const field of body.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g))
        data[field[1]] = field[2];

    if (url.pathname === '/api/auth/login') {
      if (data.password !== 'fixture-password') return send({ message: '用户名或密码错误' }, 401);
      return send({
        token: 'fixture-session',
        username: data.username,
        demo: data.username === '演示账户'
      });
    }
    if (url.pathname === '/api/auth/register') {
      state.registered = true;
      return send('注册成功，请登录');
    }
    if (state.forceUnauthorized) return send({ message: '登录已过期' }, 401);
    const type = url.searchParams.get('type');
    const filtered = () =>
      state.records.filter((item) =>
        type === 'favorite' ? item.isFavorite : type === 'watching' ? item.isWatching : true
      );

    if (url.pathname === '/api/anime/main') {
      if (state.delayMain[type])
        await new Promise((resolve) => setTimeout(resolve, state.delayMain[type]));
      if (state.failMain) return send({ message: '测试服务暂时不可用' }, 503);
      if (type === 'stats')
        return send({
          totalFinished: state.records.length,
          totalFavorite: state.records.filter((item) => item.isFavorite).length,
          totalWatching: state.records.filter((item) => item.isWatching).length
        });
      if (type === 'finished')
        return send({
          groupedAnimes: [
            { year: 2026, month: 11, count: state.records.length, animes: state.records }
          ]
        });
      return send({ animes: filtered(), total: filtered().length });
    }
    if (url.pathname.includes('/stats/'))
      return send({
        labels: Array.from({ length: url.pathname.endsWith('weekly') ? 7 : 12 }, (_, index) =>
          String(index + 1)
        ),
        values: [3, 5, 7, 2, 4, 9, 3, 4, 1, 7, 6, 4]
      });
    if (url.pathname === '/api/anime/list') {
      if (state.delayList[type])
        await new Promise((resolve) => setTimeout(resolve, state.delayList[type]));
      if (state.failList) return send({ message: '测试服务暂时不可用' }, 503);
      const page = Number(url.searchParams.get('page') || 1);
      const records = filtered();
      const totalPages = Math.max(1, Math.ceil(records.length / 8));
      const safePage = Math.min(page, totalPages);
      return send({
        content: records.slice((safePage - 1) * 8, safePage * 8),
        totalPages,
        number: safePage - 1
      });
    }
    if (url.pathname === '/api/anime/tmdb/search')
      return send([{ ...state.records[0], title: url.searchParams.get('query'), episodes: 12 }]);
    if (url.pathname === '/api/anime/update' || url.pathname === '/api/anime/add') {
      const record = {
        id: Number(data.id) || Math.max(...state.records.map((item) => item.id), 0) + 1,
        title: data.title,
        totalEpisodes: Number(data.episodes),
        finishDate: data.finishDate,
        isFavorite: data.isFavorite === 'true',
        isWatching: data.isWatching === 'true',
        description: data.description,
        coverImage: data.coverImageUrl || state.records[0]?.coverImage
      };
      if (data.id)
        state.records = state.records.map((item) =>
          item.id === record.id ? { ...item, ...record } : item
        );
      else state.records.push(record);
      return send('保存成功');
    }
    if (/^\/api\/anime\/\d+$/.test(url.pathname)) {
      const id = Number(url.pathname.split('/').pop());
      if (request.method === 'DELETE') {
        state.records = state.records.filter((item) => item.id !== id);
        return send('删除成功');
      }
      return send(
        state.records.find((item) => item.id === id) || {},
        state.records.some((item) => item.id === id) ? 200 : 404
      );
    }
    if (url.pathname === '/api/demo-user') {
      if (request.method === 'POST') {
        state.demoUser = { username: data.username };
        return send(state.demoUser);
      }
      if (request.method === 'DELETE') {
        state.demoUser = null;
        return send('已删除');
      }
      return send(state.demoUser || {}, state.demoUser ? 200 : 404);
    }
    if (url.pathname === '/api/demo-user/password') return send('修改成功');
    send({}, 404);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  state.records = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `测试作品 ${index + 1}`,
    totalEpisodes: 12,
    finishDate: '2026-11-12',
    coverImage: `${origin}/covers/${index % 21}.${originalImages ? 'jpg' : 'webp'}${uniqueCovers ? '?record=' + index : ''}`,
    description: '这是本地回归测试的示例内容。',
    isFavorite: index % 3 === 0,
    isWatching: index % 5 === 0
  }));
  return {
    origin,
    state,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      })
  };
}

module.exports = { startFixture };
