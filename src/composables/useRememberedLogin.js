import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useNotify } from '@/composables/useNotify';

/** 桌面密码仅经受限桥接读写，退出登录只清理会话，不删除用户选择记住的账号。 */
export function useRememberedLogin() {
  const desktop = window.limangeDesktop;
  const supported = Boolean(desktop?.getRememberedLogin);
  const available = ref(false);
  const busy = ref(supported);
  const username = ref('');
  const password = ref('');
  const remember = ref(false);
  const notify = useNotify();

  let loadVersion = 0;

  async function restore() {
    if (!supported) return;
    const version = ++loadVersion;
    busy.value = true;
    username.value = '';
    password.value = '';
    remember.value = false;

    try {
      const saved = await desktop.getRememberedLogin();
      if (version !== loadVersion) return;
      available.value = saved.available;
      if (saved.credentials) {
        username.value = saved.credentials.username;
        password.value = saved.credentials.password;
        remember.value = true;
      }
    } catch {
      if (version === loadVersion) {
        notify.message({ content: '无法读取已保存的账号密码，请手动输入', type: 'error' });
      }
    } finally {
      if (version === loadVersion) busy.value = false;
    }
  }

  /** 取消勾选立即清除保存记录，不要求用户再登录一次。 */
  async function changeRemember(event) {
    remember.value = event.target.checked;
    if (remember.value) return;

    busy.value = true;
    try {
      await desktop.forgetLogin();
    } catch {
      remember.value = true;
      notify.message({ content: '未能清除已保存的账号密码，请重试', type: 'error' });
    } finally {
      busy.value = false;
    }
  }

  async function persist(credentials) {
    if (!supported) return;
    try {
      if (remember.value) await desktop.rememberLogin(credentials);
      else await desktop.forgetLogin();
    } catch {
      // 记忆偏好失败不影响本次已经成功的身份认证，但需要明确告知用户。
      notify.message({
        content: '登录成功，但账号密码记忆设置未能保存，请稍后重试',
        type: 'error'
      });
    }
  }

  onMounted(restore);
  onBeforeUnmount(() => {
    loadVersion++;
    password.value = '';
  });

  return {
    supported,
    available,
    busy,
    username,
    password,
    remember,
    restore,
    changeRemember,
    persist
  };
}
