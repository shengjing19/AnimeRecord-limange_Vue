const fs = require('node:fs/promises');

/** 配置写入串行合并并原子替换，避免窗口、服务器和登录偏好互相覆盖。 */
async function createSettingsStore(file) {
  let values = {};
  let pending = Promise.resolve();

  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) values = parsed;
  } catch {
    // 首次启动或配置损坏时使用默认值，后续成功写入会修复配置。
  }

  return {
    get: (key) => values[key],
    update(patch) {
      const write = pending.then(async () => {
        const next = { ...values, ...patch };
        const temporary = `${file}.tmp`;
        await fs.writeFile(temporary, JSON.stringify(next, null, 2), {
          encoding: 'utf8',
          mode: 0o600
        });
        await fs.rename(temporary, file);
        values = next;
      });

      // 单次失败向调用方报告，但不阻塞之后的配置写入。
      pending = write.catch(() => {});
      return write;
    },
    flush: () => pending
  };
}

module.exports = { createSettingsStore };
