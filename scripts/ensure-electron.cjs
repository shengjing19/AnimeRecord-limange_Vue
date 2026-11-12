const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/** 部分 npm 环境禁止依赖安装脚本，打包前明确补齐 Electron 运行时。 */
try {
  const executable = require('electron');
  if (fs.existsSync(executable)) process.exit(0);
} catch {
  /* 缺少二进制时继续执行官方安装器。 */
}

const installer = path.join(path.dirname(require.resolve('electron/package.json')), 'install.js');
const result = spawnSync(process.execPath, [installer], { stdio: 'inherit', windowsHide: true });
if (result.status !== 0) {
  console.error('无法下载 Electron。请检查网络，或按 README 配置 ELECTRON_MIRROR 后重试。');
  process.exit(result.status || 1);
}
