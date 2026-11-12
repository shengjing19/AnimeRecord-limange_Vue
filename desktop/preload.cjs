const { contextBridge, ipcRenderer } = require('electron');

/** 渲染层只获得必要窗口操作，禁止暴露通用 IPC、文件系统或 Node 对象。 */
contextBridge.exposeInMainWorld('limangeDesktop', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  close: () => ipcRenderer.invoke('window:close'),
  getServerUrl: () => ipcRenderer.invoke('settings:get-server'),
  getPerformanceInfo: () => ipcRenderer.invoke('performance:info'),
  setServerUrl: (value) => ipcRenderer.invoke('settings:set-server', value),
  onMaximized: (callback) => {
    const listener = (_event, value) => callback(Boolean(value));
    ipcRenderer.on('window:maximized', listener);
    return () => ipcRenderer.removeListener('window:maximized', listener);
  }
});
