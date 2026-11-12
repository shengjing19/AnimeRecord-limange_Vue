<template>
  <div class="login-page" :class="{ 'console-login': appStore.loginStyle === 'console' }">
    <div class="login-options">
      <button
        type="button"
        @click="appStore.setLoginStyle(appStore.loginStyle === 'console' ? 'native' : 'console')"
      >
        {{ appStore.loginStyle === 'console' ? '原生登录' : '控制台登录' }}</button
      ><button type="button" @click="showServerSettings = !showServerSettings">服务器设置</button>
    </div>
    <div v-if="showServerSettings" class="login-server-panel">
      <ServerSettings input-id="login-server-url" /><button
        class="server-panel-close"
        aria-label="关闭服务器设置"
        @click="showServerSettings = false"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <section v-if="appStore.loginStyle === 'console'" class="console-art" aria-label="漫画插画">
      <div class="art-label">
        <span>THE PERSONAL ANIME ARCHIVE</span><span>01 / COLLECTION</span>
      </div>
      <div class="art-copy">
        <span class="art-kicker">物語を、ここに。</span>
        <h1>每一个好故事，<br />都值得收藏<span>。</span></h1>
        <p>记录你的热爱，留住每一次心动。<br />欢迎回到你的动漫世界。</p>
        <div class="art-rule"></div>
        <span class="art-footer">limange <span> / </span> YOUR STORIES LIVE HERE.</span>
      </div>
      <span class="art-side-text" aria-hidden="true">思い出のコレクション</span>
    </section>
    <div v-if="appStore.loginStyle === 'native'" class="background" aria-hidden="true">
      <div
        v-for="i in columnCount"
        :key="i"
        class="waterfall-column"
        :ref="
          (el) => {
            if (el) columns[i - 1] = el;
          }
        "
      ></div>
    </div>
    <img
      v-if="appStore.loginStyle === 'native'"
      src="/img/animerecode.png"
      alt="Anime Record Logo"
      class="login-logo"
    />
    <div class="newlogin" :class="{ 'register-mode': authMode === AUTH_MODE.REGISTER }">
      <div v-if="appStore.loginStyle === 'console'" class="console-form-heading">
        <img src="/img/app-icon.png" alt="limange" /><span>WELCOME BACK</span>
        <h2>{{ authMode === AUTH_MODE.LOGIN ? '登录你的收藏室' : '创建你的收藏室' }}</h2>
        <p>
          {{
            authMode === AUTH_MODE.LOGIN
              ? '很高兴见到你，故事从这里继续。'
              : '首次使用？创建管理员账户以开始记录。'
          }}
        </p>
      </div>
      <img v-else src="/img/UsersIcon.png" class="newico" alt="用户头像图标" />
      <div class="auth-form-viewport">
        <form
          class="auth-form-panel login-panel"
          aria-label="登录表单"
          :aria-hidden="authMode !== AUTH_MODE.LOGIN"
          :inert="authMode !== AUTH_MODE.LOGIN"
          @submit.prevent="handleLogin"
        >
          <input
            v-model="loginUsername"
            type="text"
            class="newpass"
            placeholder="输入用户名"
            aria-label="用户名"
            autocomplete="username"
            :maxlength="MAX_USERNAME_LENGTH"
            :disabled="isLoginSubmitting"
            required
            aria-required="true"
          />
          <div class="password-wrapper">
            <input
              v-model="loginPassword"
              :type="showLoginPassword ? 'text' : 'password'"
              class="newpass"
              placeholder="输入密码"
              aria-label="密码"
              autocomplete="current-password"
              :maxlength="MAX_PASSWORD_LENGTH"
              :disabled="isLoginSubmitting"
              required
              aria-required="true"
            />
            <div class="inline-actions" v-show="loginPassword.length > 0">
              <button
                type="button"
                class="inline-action-btn toggle-pwd-btn"
                :disabled="isLoginSubmitting"
                @click="showLoginPassword = !showLoginPassword"
                :title="showLoginPassword ? '隐藏密码' : '显示密码'"
                :aria-label="showLoginPassword ? '隐藏密码' : '显示密码'"
              >
                <i :class="['fa-solid', showLoginPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
              </button>
              <button
                type="submit"
                class="inline-action-btn submit-btn"
                title="点击登录"
                aria-label="提交登录"
                :disabled="isLoginSubmitting"
              >
                <i
                  :class="['fa-solid', isLoginSubmitting ? 'fa-spinner fa-spin' : 'fa-arrow-right']"
                ></i>
              </button>
            </div>
          </div>
          <button
            v-if="appStore.loginStyle === 'console'"
            type="submit"
            class="console-submit"
            :disabled="isLoginSubmitting"
          >
            <span>{{ isLoginSubmitting ? '正在登录…' : '登录' }}</span
            ><i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </form>
        <form
          class="auth-form-panel register-panel"
          aria-label="系统初始化注册表单"
          :aria-hidden="authMode !== AUTH_MODE.REGISTER"
          :inert="authMode !== AUTH_MODE.REGISTER"
          @submit.prevent="handleRegister"
        >
          <input
            ref="registerUsernameInput"
            v-model="registerUsername"
            type="text"
            class="newpass"
            placeholder="初始化用户名"
            aria-label="初始化用户名"
            autocomplete="username"
            :maxlength="MAX_USERNAME_LENGTH"
            :disabled="isRegisterSubmitting || isRegisterConfirming"
            required
            aria-required="true"
          />
          <div class="password-wrapper">
            <input
              v-model="registerPassword"
              :type="showRegisterPassword ? 'text' : 'password'"
              class="newpass"
              placeholder="初始化密码"
              aria-label="初始化密码"
              autocomplete="new-password"
              :maxlength="MAX_PASSWORD_LENGTH"
              :disabled="isRegisterSubmitting || isRegisterConfirming"
              required
              aria-required="true"
            />
            <div class="inline-actions" v-show="registerPassword.length > 0">
              <button
                type="button"
                class="inline-action-btn toggle-pwd-btn"
                :disabled="isRegisterSubmitting || isRegisterConfirming"
                @click="showRegisterPassword = !showRegisterPassword"
                :title="showRegisterPassword ? '隐藏密码' : '显示密码'"
                :aria-label="showRegisterPassword ? '隐藏密码' : '显示密码'"
              >
                <i :class="['fa-solid', showRegisterPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
              </button>
              <button
                type="submit"
                class="inline-action-btn submit-btn register-submit-btn"
                title="点击注册"
                aria-label="提交系统初始化注册"
                :disabled="isRegisterSubmitting || isRegisterConfirming"
              >
                <i
                  :class="[
                    'fa-solid',
                    isRegisterSubmitting ? 'fa-spinner fa-spin' : 'fa-user-plus'
                  ]"
                ></i>
              </button>
            </div>
          </div>
          <button
            v-if="appStore.loginStyle === 'console'"
            type="submit"
            class="console-submit"
            :disabled="isRegisterSubmitting || isRegisterConfirming"
          >
            <span>{{ isRegisterSubmitting ? '正在创建…' : '创建管理员账户' }}</span
            ><i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </form>
      </div>
      <div class="login-tip-row">
        <p class="newlogintip">
          {{ authMode === AUTH_MODE.LOGIN ? '请输入用户名与密码登录' : '请填写初始化管理员账号' }}
        </p>
        <button
          v-if="authMode === AUTH_MODE.LOGIN && registerAvailable"
          type="button"
          class="register-link"
          @click="switchToRegister"
        >
          首次初始化系统？请注册
        </button>
        <button
          v-else-if="authMode === AUTH_MODE.REGISTER"
          type="button"
          class="register-link"
          :disabled="isRegisterSubmitting || isRegisterConfirming"
          @click="switchToLogin"
        >
          返回登录
        </button>
      </div>
      <div v-if="appStore.loginStyle === 'console'" class="console-form-note">
        <i class="fa-solid fa-lock" aria-hidden="true"></i> 连接到你自己的动漫服务
      </div>
      <div v-if="activeErrorMsg" class="login-error" role="alert">{{ activeErrorMsg }}</div>
    </div>
    <div class="version-info">
      <span>{{ APP_CONFIG.appName }} {{ APP_CONFIG.version }} ({{ APP_CONFIG.techStack }})</span>
      <br />
      <span>Github: {{ APP_CONFIG.github }}</span>
    </div>
  </div>
</template>

<script setup>
/**
 * @module LoginView
 * @description 登录页面逻辑，包括背景动画初始化、表单校验以及登录接口请求
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '@/api/anime';
import { useAuthStore } from '@/stores/auth';
import { useNotify } from '@/composables/useNotify';
import { APP_CONFIG } from '@/utils/constants';
import { useAppStore } from '@/stores/app';
import ServerSettings from '@/components/settings/ServerSettings.vue';
import { shuffleArray } from '@/utils/helpers';

// 路由与状态库实例化
const router = useRouter();
const appStore = useAppStore();
const showServerSettings = ref(false);
const authStore = useAuthStore();
const notify = useNotify();

/** 登录/注册面板模式枚举 */
const AUTH_MODE = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register'
});

/** 用户名最大长度，限制异常大输入造成前后端资源浪费 */
const MAX_USERNAME_LENGTH = 64;

/** 密码最大长度，避免超长明文在确认框和网络请求中滞留 */
const MAX_PASSWORD_LENGTH = 128;

/** 控制字符检测表达式，阻断换行、NULL 等不可见字符进入账号体系 */
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/u;

// 响应式登录表单状态
const authMode = ref(AUTH_MODE.LOGIN);
const loginUsername = ref('');
const loginPassword = ref('');
const loginErrorMsg = ref('');
const showLoginPassword = ref(false);
const isLoginSubmitting = ref(false);

// 响应式初始化注册表单状态
const registerUsername = ref('');
const registerPassword = ref('');
const registerErrorMsg = ref('');
const showRegisterPassword = ref(false);
const isRegisterSubmitting = ref(false);
const isRegisterConfirming = ref(false);
const registerAvailable = ref(true);
const registerUsernameInput = ref(null);

/** 注册表单聚焦定时器，组件卸载时统一清理 */
let registerFocusTimer = 0;

/** 当前登录/注册模式下需要展示的错误文案 */
const activeErrorMsg = computed(() =>
  authMode.value === AUTH_MODE.LOGIN ? loginErrorMsg.value : registerErrorMsg.value
);

/**
 * 桌面端使用四列瀑布流背景
 */
const columnCount = ref(4);

/**
 * 瀑布流列DOM引用，使用 shallowRef 提升性能，避免深层代理
 * @type {import('vue').ShallowRef<HTMLElement[]>}
 */
const columns = shallowRef([]);

/**
 * 瀑布流背景图片URL列表
 * @constant {string[]}
 */
const imageUrls = Array.from({ length: 21 }, (_, i) => `/img/login/${i + 1}.webp`);

/**
 * 组件挂载状态，用于控制异步流程
 */
const isMounted = ref(false);

/**
 * @function initWaterfall
 * @description 初始化瀑布流动画背景。
 * 优化条项：
 * 1. 增加 isMounted 守卫防止卸载后的异步操作。
 * 2. 使用 DocumentFragment 减少重绘，提升 WebKit 性能。
 * 3. 延迟动画触发，确保 Safari 正确计算容器高度（解决 -50% 塌陷问题）。
 */
async function initWaterfall() {
  if (appStore.loginStyle !== 'native') return;
  const cols = columns.value.slice(0, columnCount.value).filter(Boolean);
  if (cols.length === 0) return;

  const shuffledUrls = shuffleArray([...imageUrls]);

  // 预加载图片
  const images = await Promise.all(
    shuffledUrls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        })
    )
  );

  // 异步加载后检查组件是否还处于挂载状态
  if (!isMounted.value || appStore.loginStyle !== 'native') return;

  // 构造 DOM (使用 Fragment 提升性能)
  const columnFragments = cols.map(() => document.createDocumentFragment());

  images.forEach((img, index) => {
    if (!img) return;
    const colIndex = index % cols.length;
    const container = document.createElement('div');
    container.className = 'img-container';
    container.appendChild(img.cloneNode());
    columnFragments[colIndex].appendChild(container);
  });

  cols.forEach((column, i) => {
    column.replaceChildren();
    const track = document.createElement('div');
    track.className = 'scroll-track';

    const wrapper = document.createElement('div');
    wrapper.className = 'column-wrapper';
    wrapper.appendChild(columnFragments[i]);

    track.appendChild(wrapper);
    // 复制一份用于实现无缝循环
    track.appendChild(wrapper.cloneNode(true));
    column.appendChild(track);

    // 延迟启动动画 (解决 WebKit 下高度计算为 0 的问题)
    requestAnimationFrame(() => {
      if (!isMounted.value) return;
      track.classList.add('is-active');
    });
  });
}

/**
 * @function extractApiMessage
 * @description 统一提取后端返回的错误或提示文本，避免对象直接渲染到页面。
 * @param {unknown} err - Axios异常或普通异常
 * @param {string} fallback - 默认兜底文案
 * @returns {string} 可展示的安全文本
 */
function extractApiMessage(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  if (typeof data?.message === 'string') return data.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * @function validateCredentials
 * @description 登录和初始化注册共用的前端输入校验。
 * @param {string} usernameValue - 已裁剪空白的用户名
 * @param {string} passwordValue - 原始密码文本
 * @returns {string} 为空表示校验通过，否则为错误提示
 */
function validateCredentials(usernameValue, passwordValue) {
  if (!usernameValue || !passwordValue.trim()) {
    return '请输入用户名和密码';
  }

  if (usernameValue.length > MAX_USERNAME_LENGTH) {
    return `用户名不能超过 ${MAX_USERNAME_LENGTH} 个字符`;
  }

  if (passwordValue.length > MAX_PASSWORD_LENGTH) {
    return `密码不能超过 ${MAX_PASSWORD_LENGTH} 个字符`;
  }

  if (CONTROL_CHAR_PATTERN.test(usernameValue) || CONTROL_CHAR_PATTERN.test(passwordValue)) {
    return '用户名和密码不能包含换行或不可见字符';
  }

  return '';
}

/**
 * @function switchToRegister
 * @description 切换到初始化注册表单，并在动画结束后聚焦用户名输入框。
 */
async function switchToRegister() {
  loginErrorMsg.value = '';
  registerErrorMsg.value = '';
  authMode.value = AUTH_MODE.REGISTER;

  await nextTick();
  if (registerFocusTimer) window.clearTimeout(registerFocusTimer);
  registerFocusTimer = window.setTimeout(() => {
    if (isMounted.value) {
      registerUsernameInput.value?.focus();
    }
  }, 360);
}

/**
 * @function switchToLogin
 * @description 切回登录表单，并清理注册密码，降低明文密码在页面内的滞留时间。
 */
function switchToLogin() {
  if (isRegisterSubmitting.value || isRegisterConfirming.value) return;

  authMode.value = AUTH_MODE.LOGIN;
  registerErrorMsg.value = '';
  registerPassword.value = '';
  showRegisterPassword.value = false;
}

/**
 * @function handleLogin
 * @description 处理登录提交事件，包含基础校验、重复提交保护及 API 错误回显处理。
 * @returns {Promise<void>}
 */
async function handleLogin() {
  if (isLoginSubmitting.value) return;

  loginErrorMsg.value = '';
  const normalizedUsername = loginUsername.value.trim();
  const validationMessage = validateCredentials(normalizedUsername, loginPassword.value);

  // 基础安全性及合规性校验
  if (validationMessage) {
    loginErrorMsg.value = validationMessage;
    return;
  }

  isLoginSubmitting.value = true;
  try {
    const response = await authApi.login(normalizedUsername, loginPassword.value);
    const token = response.data?.token;
    const responseUsername = response.data?.username || normalizedUsername;
    const isDemoAccount = response.data?.demo === true;

    if (!token) {
      throw new Error('登录响应缺少 Token');
    }

    // 更新全局鉴权状态
    authStore.setAuth(token, responseUsername, isDemoAccount);
    // 登录成功后跳转主页
    await router.push('/');
  } catch (err) {
    loginErrorMsg.value = extractApiMessage(err, '登录失败，请检查用户名和密码');
  } finally {
    isLoginSubmitting.value = false;
  }
}

/**
 * @function handleRegister
 * @description 处理系统初始化注册：先明文确认，用户确认后再调用后端注册接口。
 * @returns {Promise<void>}
 */
async function handleRegister() {
  if (isRegisterSubmitting.value || isRegisterConfirming.value || !registerAvailable.value) return;

  registerErrorMsg.value = '';
  const normalizedUsername = registerUsername.value.trim();
  const validationMessage = validateCredentials(normalizedUsername, registerPassword.value);

  if (validationMessage) {
    registerErrorMsg.value = validationMessage;
    return;
  }

  // 将用户名规范化回填到输入框，保证确认框与实际提交值完全一致。
  registerUsername.value = normalizedUsername;
  isRegisterConfirming.value = true;

  const confirmed = await notify.confirm({
    title: '确认初始化注册',
    content: `用户名：${normalizedUsername}\n密码（明文）：${registerPassword.value}\n\n账号一旦注册不可修改，请确认信息无误后继续。`,
    confirmText: '确定注册',
    cancelText: '返回修改',
    type: 'warning'
  });

  isRegisterConfirming.value = false;
  if (!confirmed) return;

  isRegisterSubmitting.value = true;
  try {
    const response = await authApi.register(normalizedUsername, registerPassword.value);
    const successMessage = typeof response.data === 'string' ? response.data : '注册成功，请登录';

    notify.message({ content: successMessage, type: 'success' });
    loginUsername.value = normalizedUsername;
    registerUsername.value = '';
    registerPassword.value = '';
    showRegisterPassword.value = false;
    authMode.value = AUTH_MODE.LOGIN;
  } catch (err) {
    const status = err?.response?.status;
    const message = extractApiMessage(err, '注册失败，请稍后重试');

    if (status === 403) {
      registerAvailable.value = false;
      authMode.value = AUTH_MODE.LOGIN;
      registerPassword.value = '';
      showRegisterPassword.value = false;
      loginErrorMsg.value = '系统已初始化，请使用已有账号登录';
      notify.message({ content: '系统已初始化，请使用已有账号登录', type: 'error' });
      return;
    }

    registerErrorMsg.value = message;
    notify.message({ content: message, type: 'error' });
  } finally {
    isRegisterSubmitting.value = false;
  }
}

watch(
  () => appStore.loginStyle,
  async () => {
    columns.value = [];
    await nextTick();
    initWaterfall().catch(() => {});
  }
);

// 组件挂载完成
onMounted(() => {
  isMounted.value = true;
  initWaterfall().catch(() => {});
});

// 组件卸载前清理
onBeforeUnmount(() => {
  isMounted.value = false;
  if (registerFocusTimer) {
    window.clearTimeout(registerFocusTimer);
  }
  columns.value.filter(Boolean).forEach((col) => {
    col.replaceChildren();
  });
});
</script>

<style scoped>
.login-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background-color: #1a1a1a;
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* 瀑布流背景层样式 */

.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  gap: 1rem;
  transform: rotate(-15deg) scale(1.5);
  pointer-events: none;
  z-index: 0;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.waterfall-column :deep(.scroll-track) {
  position: absolute;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  will-change: transform;

  /* 初始不可见，防止布局跳变 */
  opacity: 0;
  transition: opacity 0.8s ease;
}

.waterfall-column :deep(.scroll-track.is-active) {
  opacity: 1;
  animation: scroll 40s linear infinite;
}

.waterfall-column :deep(.column-wrapper) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.waterfall-column:nth-child(1) :deep(.scroll-track) {
  animation-delay: -10s;
}

.waterfall-column:nth-child(2) :deep(.scroll-track) {
  animation-delay: -25s;
}

.waterfall-column:nth-child(3) :deep(.scroll-track) {
  animation-delay: -40s;
}

.waterfall-column:nth-child(4) :deep(.scroll-track) {
  animation-delay: -15s;
}

.background :deep(.waterfall-column img) {
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  opacity: 0.2;
  transition: opacity 0.3s ease;
}

@keyframes scroll {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(-50%);
  }

  /* 滚动距离改为50%，因为复制了一份wrapper */
}

/* 品牌 Logo 居中显示 */

.login-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1300px;
  max-width: 90vw;

  /* 确保在小屏幕下不会超出 */
  height: auto;
  z-index: 1;

  /* 增加禁止点击防止误操作及被选取 */
  pointer-events: none;
  user-select: none;
}

/* 登录面板容器 */

.newlogin {
  position: absolute;
  bottom: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;

  /* 确保层级高于背景和Logo */
  transition: bottom 0.3s ease;
}

.newico {
  width: 90px;
  height: 90px;
  user-select: none;
}

/* 登录与初始化注册表单动画轨道 */

.auth-form-viewport {
  position: relative;
  width: 230px;
  height: 3.375rem;
  overflow: hidden;
  display: flex;
  justify-content: center;
  margin-top: 2px;
}

.auth-form-panel {
  position: absolute;
  top: 0;
  left: 50%;
  width: 210px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  opacity: 1;
  filter: blur(0);
  transition:
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.32s ease,
    filter 0.32s ease;
  will-change: transform, opacity;
}

.register-panel {
  transform: translateX(58%);
  opacity: 0;
  pointer-events: none;
  filter: blur(2px);
}

.newlogin.register-mode .login-panel {
  transform: translateX(-158%);
  opacity: 0;
  pointer-events: none;
  filter: blur(2px);
}

.newlogin.register-mode .register-panel {
  transform: translateX(-50%);
  opacity: 1;
  pointer-events: auto;
  filter: blur(0);
}

/* 统一输入框样式 */

.newpass {
  width: 150px;
  height: 25px;
  color: #ffffff;
  background: rgba(255, 255, 255, 0);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 1000px;
  border: 1px solid rgba(255, 255, 255, 0.2);

  /* 增加细微边框增强轮廓与对比度 */
  transition:
    transform 0.15s ease-in-out,
    background 0.2s ease,
    border-color 0.2s;
  margin-top: 5px;
  padding: 4px 12px;
  outline: none;
  box-sizing: border-box;
}

.auth-form-panel > .newpass {
  margin-top: 0;
}

.newpass:focus {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.newpass:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

input.newpass::placeholder {
  color: rgba(255, 255, 255, 0.507);
}

/* 密码输入框外层包装，用于绝对定位内部按钮 */

.password-wrapper {
  position: relative;
  display: inline-flex;
  margin-top: 4px;
}

/* 覆盖默认的 newpass 边距，由 wrapper 统一控制 */

.password-wrapper .newpass {
  margin-top: 0;
  padding-right: 50px;

  /* 为右侧两个按钮预留足够交互空间 */
}

/* 密码框内联操作区容器 */

.inline-actions {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 密码框内联操作按钮基础样式 */

.inline-action-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.6);
  color: #333;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  outline: none;
}

.inline-action-btn:hover,
.inline-action-btn:focus-visible {
  background: rgba(255, 255, 255, 1);
  color: #000;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
}

.inline-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}

.submit-btn {
  font-weight: bold;
}

.login-tip-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  max-width: min(360px, 92vw);
  margin-top: 5px;
}

.newlogintip {
  color: white;
  margin: 0;
  text-shadow:
    2px 2px 8px #000,
    0px 0px 4px #000,
    -2px -2px 8px #000;
  opacity: 0.75;
  font-size: 15px;
  user-select: none;
}

.register-link {
  border: none;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  padding: 2px 0;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-shadow:
    2px 2px 8px #000,
    0 0 4px #000;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.register-link:hover,
.register-link:focus-visible {
  opacity: 0.86;
  transform: translateY(-1px);
  outline: none;
}

.register-link:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

.login-error {
  color: #ff3b30;
  font-size: 13px;
  margin-top: 8px;
  text-align: center;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
  max-width: 200px;
  word-break: break-word;
}

/* 版本与系统环境信息 */

.version-info {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 1001;
  color: #ffffff;
  font-size: 14px;
  opacity: 0.9;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);
  user-select: none;
}
</style>

<style scoped>
.login-options {
  position: absolute;
  top: 20px;
  right: 24px;
  display: flex;
  gap: 17px;
  z-index: 5;
}
.login-options button {
  background: none;
  border: none;
  color: #9aaabe;
  font-size: 10px;
}
.login-options button:hover {
  color: #4495de;
}
.login-server-panel {
  position: absolute;
  top: 58px;
  right: 24px;
  z-index: 10;
  width: min(500px, 90vw);
  box-shadow: 0 15px 50px #13233825;
}
.server-panel-close {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 5px;
  border: none;
  background: transparent;
  color: #7a899a;
}
.console-login {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 440px;
  background: #fafbfd;
  align-items: stretch;
}
.console-art {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #d4dfe9;
  background:
    linear-gradient(180deg, #e2ebf522 0%, #f3f7f98c 48%, #eef4fb 95%),
    url('/img/manga-wallpaper.webp') 62% center / cover;
  border-left: 3px solid #4d88c1;
  overflow: hidden;
}
.art-label {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 27px 36px;
  font-size: 8px;
  letter-spacing: 1.8px;
  color: #476283;
  background: #ffffff35;
}
.art-copy {
  position: relative;
  margin-top: auto;
  padding: 65px 55px 40px;
}
.art-kicker {
  display: inline-block;
  font-size: 12px;
  color: #486788;
  letter-spacing: 5px;
  margin-bottom: 22px;
}
.art-copy h1 {
  font-size: clamp(30px, 3.2vw, 50px);
  font-weight: 500;
  line-height: 1.6;
  color: #304d70;
  letter-spacing: 3px;
}
.art-copy h1 > span {
  color: #3d91d8;
}
.art-copy p {
  font-size: 12px;
  line-height: 2.1;
  color: #698099;
  margin-top: 22px;
}
.art-rule {
  width: 44px;
  height: 2px;
  background: #839db9;
  margin-top: 40px;
  margin-bottom: 22px;
}
.art-footer {
  font-size: 10px;
  color: #69809b;
  letter-spacing: 2px;
}
.art-footer span {
  margin: 0 9px;
}
.art-side-text {
  position: absolute;
  right: 30px;
  top: 25%;
  writing-mode: vertical-rl;
  letter-spacing: 8px;
  color: #4e6e90;
  font-size: 12px;
}
.console-login .newlogin {
  position: relative;
  inset: auto;
  display: flex;
  width: 100%;
  align-items: stretch;
  justify-content: center;
  padding: 60px 48px;
  overflow-y: auto;
}
.console-form-heading > img {
  width: 46px;
  height: 46px;
  display: block;
  object-fit: contain;
  margin-bottom: 35px;
}
.console-form-heading > span {
  display: block;
  font-size: 9px;
  letter-spacing: 2px;
  color: #8495ac;
}
.console-form-heading h2 {
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.5px;
  margin: 12px 0 10px;
  color: #34465c;
}
.console-form-heading p {
  font-size: 11px;
  color: #909cad;
  margin-bottom: 30px;
}
.console-login .auth-form-viewport {
  width: 100%;
  height: auto;
  overflow: visible;
  display: block;
  margin: 0;
}
.console-login .auth-form-panel {
  position: static;
  width: 100%;
  transform: none;
  opacity: 1;
  filter: none;
  display: flex;
  align-items: stretch;
  gap: 17px;
  transition: none;
  will-change: auto;
}
.console-login .auth-form-panel[aria-hidden='true'] {
  display: none;
}
.console-login .newpass {
  width: 100%;
  height: 42px;
  margin: 0;
  padding: 0 13px;
  background: #fff;
  border: 1px solid #d7e0e9;
  border-radius: 2px;
  color: #47566b;
  font-size: 12px;
  backdrop-filter: none;
}
.console-login .newpass::placeholder {
  color: #9eaabd;
}
.console-login .newpass:focus {
  outline: 2px solid #bdd7ef;
  outline-offset: 0;
  border-color: #70a9db;
}
.console-login .password-wrapper {
  width: 100%;
  margin: 0;
}
.console-login .inline-actions {
  right: 10px;
}
.console-login .inline-actions .submit-btn {
  display: none;
}
.console-login .inline-action-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  color: #7b8ea5;
}
.console-submit {
  height: 42px;
  margin-top: 7px;
  border: 1px solid #297cbf;
  border-radius: 2px;
  background: #3284c9;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 15px;
  font-size: 12px;
}
.console-submit:hover {
  background: #2575b8;
}
.console-login .login-tip-row {
  margin-top: 22px;
  display: block;
  text-align: center;
}
.console-login .newlogintip {
  display: none;
}
.console-login .register-link {
  color: #6d839e;
  font-size: 11px;
  text-shadow: none;
}
.console-form-note {
  margin-top: 37px;
  padding-top: 18px;
  border-top: 1px solid #e2e7ef;
  font-size: 10px;
  color: #9aabba;
  display: flex;
  align-items: center;
  gap: 8px;
}
.console-login .login-error {
  position: static;
  padding: 12px;
  background: #fff0ef;
  color: #ba5850;
  font-size: 11px;
  border: 1px solid #f1d3cf;
  max-width: none;
  width: 100%;
  margin-top: 18px;
  text-shadow: none;
}
.console-login .version-info {
  display: none;
}
@media (max-width: 1050px) {
  .console-login {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
  .console-login .newlogin {
    padding: 60px 32px;
  }
  .art-copy {
    padding-left: 32px;
    padding-right: 32px;
  }
  .art-label span:last-child {
    display: none;
  }
}
@media (max-width: 700px) {
  .console-login {
    grid-template-columns: 1fr;
  }
  .console-art {
    display: none;
  }
  .console-login .newlogin {
    max-width: 420px;
    margin: auto;
    height: 100%;
  }
}
</style>
