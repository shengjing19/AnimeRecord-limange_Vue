const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/u;

function isValidCredentials(value) {
  return (
    typeof value?.username === 'string' &&
    value.username.trim().length > 0 &&
    value.username.length <= 64 &&
    typeof value.password === 'string' &&
    value.password.trim().length > 0 &&
    value.password.length <= 128 &&
    !CONTROL_CHAR_PATTERN.test(value.username + value.password)
  );
}

/** 账号密码由操作系统加密；记录绑定后端地址，避免切换服务后误填其他服务的密码。 */
function createRememberedLogin({ settings, safeStorage, getServerUrl }) {
  function isAvailable() {
    return (
      safeStorage.isEncryptionAvailable() &&
      safeStorage.getSelectedStorageBackend?.() !== 'basic_text'
    );
  }

  return {
    get() {
      const available = isAvailable();
      const saved = settings.get('rememberedLogin');
      let credentials = null;

      if (available && saved?.serverUrl === getServerUrl() && typeof saved.encrypted === 'string') {
        try {
          const decoded = JSON.parse(
            safeStorage.decryptString(Buffer.from(saved.encrypted, 'base64'))
          );
          if (isValidCredentials(decoded)) credentials = decoded;
        } catch {
          // 系统账户变更或密文损坏时只跳过回填，仍允许用户正常登录。
        }
      }

      return { available, credentials };
    },
    save(value) {
      if (value?.serverUrl !== getServerUrl())
        throw new Error('服务器已变更，请重新登录后记住密码');
      if (!isValidCredentials(value)) throw new Error('无效的账号或密码');
      if (!isAvailable()) throw new Error('系统密码存储不可用');

      const encrypted = safeStorage
        .encryptString(
          JSON.stringify({
            username: value.username,
            password: value.password
          })
        )
        .toString('base64');

      return settings.update({ rememberedLogin: { serverUrl: getServerUrl(), encrypted } });
    },
    clear: () => settings.update({ rememberedLogin: null })
  };
}

module.exports = { createRememberedLogin };
