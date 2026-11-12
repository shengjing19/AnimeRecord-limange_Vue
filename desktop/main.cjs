const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  protocol,
  session,
  shell,
  dialog,
  screen,
  safeStorage
} = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createProtocolHandler } = require('./protocol.cjs');
const { normalizeServerUrl, isTrustedRenderer } = require('./security.cjs');
const { createSettingsStore } = require('./settings.cjs');
const { getWindowOptions, restoreWindowSize, trackWindowSize } = require('./window-state.cjs');
const { createRememberedLogin } = require('./remembered-login.cjs');

const { serverUrl: DEFAULT_SERVER_URL } = require('../shared/defaults.json');

let mainWindow;
let serverUrl = DEFAULT_SERVER_URL;
let settings;
let readyToQuit = false;

app.setName('limange');
app.setAppUserModelId('com.limange.desktop');
app.commandLine.appendSwitch('force-color-profile', 'srgb');

// 自动化验证可以使用独立用户目录，不影响真实账户和偏好。
if (process.env.LIMANGE_USER_DATA)
  app.setPath('userData', path.resolve(process.env.LIMANGE_USER_DATA));

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

function registerHandler(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (
      !mainWindow ||
      event.sender !== mainWindow.webContents ||
      !isTrustedRenderer(event.senderFrame?.url)
    )
      throw new Error('无效的调用来源');
    return handler(...args);
  });
}

async function saveServer(value) {
  const normalized = normalizeServerUrl(value);
  await settings.update({ serverUrl: normalized });
  serverUrl = normalized;
  return normalized;
}

function createWindow() {
  const windowOptions = getWindowOptions(
    settings.get('windowSize'),
    screen.getPrimaryDisplay().workAreaSize
  );
  mainWindow = new BrowserWindow({
    title: 'limange',
    ...windowOptions,
    useContentSize: true,
    show: false,
    frame: false,
    backgroundColor: '#f5f7fb',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  restoreWindowSize(mainWindow, windowOptions);
  trackWindowSize(
    mainWindow,
    (windowSize) => settings.update({ windowSize }),
    () => {
      console.error('无法保存窗口尺寸');
    }
  );

  mainWindow.once('ready-to-show', () => {
    if (!process.env.LIMANGE_TEST_HIDDEN) mainWindow.show();
  });
  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRenderer(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && code !== -3)
      dialog.showErrorBox('limange 启动失败', `无法载入应用页面：${description}`);
  });
  void mainWindow.loadURL('app://limange/');
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.show();
    mainWindow?.focus();
  });

  app
    .whenReady()
    .then(async () => {
      Menu.setApplicationMenu(null);
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      settings = await createSettingsStore(path.join(app.getPath('userData'), 'settings.json'));
      try {
        serverUrl = normalizeServerUrl(settings.get('serverUrl'));
      } catch {
        /* 缺失或损坏的配置使用默认地址，登录页仍可修改。 */
      }

      session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
        callback(false)
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      protocol.handle(
        'app',
        createProtocolHandler({
          rendererRoot: path.join(__dirname, '../dist'),
          getServerUrl: () => serverUrl
        })
      );

      registerHandler('window:minimize', () => mainWindow.minimize());
      registerHandler('window:is-maximized', () => mainWindow.isMaximized());
      registerHandler('window:toggle-maximize', () => {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
        return mainWindow.isMaximized();
      });
      registerHandler('window:close', () => mainWindow.close());
      registerHandler('settings:get-server', () => serverUrl);
      registerHandler('performance:info', () => ({
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        platform: process.platform,
        gpu: app.getGPUFeatureStatus()
      }));
      registerHandler('settings:set-server', saveServer);
      const rememberedLogin = createRememberedLogin({
        settings,
        safeStorage,
        getServerUrl: () => serverUrl
      });
      registerHandler('login:get-remembered', () => rememberedLogin.get());
      registerHandler('login:remember', (value) => rememberedLogin.save(value));
      registerHandler('login:forget', () => rememberedLogin.clear());
      createWindow();
      app.on('activate', () => {
        if (!mainWindow) createWindow();
      });
    })
    .catch((error) => {
      dialog.showErrorBox('limange 启动失败', error.message);
      app.quit();
    });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', (event) => {
    if (!settings || readyToQuit) return;
    event.preventDefault();
    // 已满足五秒条件的写入必须落盘；尚在防抖中的拉伸不会在退出时提前记录。
    void settings.flush().then(() => {
      readyToQuit = true;
      app.quit();
    });
  });
}
