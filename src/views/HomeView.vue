<template>
  <!--
    HomeView.vue - 主页视图
    包含侧边栏导航、Keep-Alive缓存、Tab内容切换、详情弹窗
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <div class="app-container">
    <!-- 侧边栏 -->
    <AppSidebar :active-tab="activeTab" @tab-change="handleTabChange" />

    <!-- 主内容区 -->
    <main class="app-main" ref="mainContainer">
      <!-- 顶部导航头 -->
      <AppHeader :title="pageTitle" />

      <!-- 内容区域，使用KeepAlive缓存机制 -->
      <div class="content-section" ref="contentSection">
        <!-- 加载动画 -->
        <LoadingSpinner v-if="loading" />

        <!-- 已看完/最喜欢/正在追 列表 -->
        <template v-if="activeTab === 'finished' && cachedData.finished">
          <div
            v-for="group in cachedData.finished.groupedAnimes"
            :key="`${group.year}-${group.month}`"
            class="ios-section"
          >
            <div class="ios-section-header">
              {{ group.year }}
              <span class="ios-section-sub">{{ group.month }}</span>
              <span class="ios-section-count">{{ group.count }} 部</span>
            </div>
            <div class="anime-grid">
              <AnimeCard
                v-for="anime in group.animes"
                :key="anime.id"
                :anime="anime"
                @click="openDetail"
              />
            </div>
          </div>
          <p v-if="!cachedData.finished.groupedAnimes?.length" class="empty-text">暂无数据</p>
        </template>

        <template v-if="activeTab === 'favorite' && cachedData.favorite">
          <div class="ios-section">
            <div class="ios-section-header">
              全部
              <span class="ios-section-count">共 {{ cachedData.favorite.total }} 部</span>
            </div>
            <div class="anime-grid">
              <AnimeCard
                v-for="anime in cachedData.favorite.animes"
                :key="anime.id"
                :anime="anime"
                @click="openDetail"
              />
            </div>
          </div>
          <p v-if="!cachedData.favorite.animes?.length" class="empty-text">暂无数据</p>
        </template>

        <template v-if="activeTab === 'watching' && cachedData.watching">
          <div class="ios-section">
            <div class="ios-section-header">
              全部
              <span class="ios-section-count">共 {{ cachedData.watching.total }} 部</span>
            </div>
            <div class="anime-grid">
              <AnimeCard
                v-for="anime in cachedData.watching.animes"
                :key="anime.id"
                :anime="anime"
                @click="openDetail"
              />
            </div>
          </div>
          <p v-if="!cachedData.watching.animes?.length" class="empty-text">暂无数据</p>
        </template>

        <!-- 数据统计 -->
        <transition name="mobile-modal">
          <div v-if="activeTab === 'stats' && cachedData.stats" class="mobile-fullscreen-modal">
            <div class="modal-topbar mobile-only">
              <button class="modal-back-btn" @click="handleTabChange({ key: 'settings', label: '我的' })">
                <i class="fas fa-arrow-left"></i>
              </button>
              <span class="modal-title">数据统计</span>
            </div>
            <div class="modal-scroll-content">
              <div class="stats-grid">
                <div class="stat-card">
                  <i class="fas fa-eye"></i>
                  <h3>{{ cachedData.stats.totalFinished }}</h3>
                  <p>已看完</p>
                </div>
                <div class="stat-card">
                  <i class="fas fa-heart"></i>
                  <h3>{{ cachedData.stats.totalFavorite }}</h3>
                  <p>最喜爱</p>
                </div>
                <div class="stat-card">
                  <i class="fas fa-running"></i>
                  <h3>{{ cachedData.stats.totalWatching }}</h3>
                  <p>正在追</p>
                </div>
                <div class="stat-card">
                  <i class="fas fa-calendar-alt"></i>
                  <h3>{{ cachedData.stats.lastSevenDaysTotal }}</h3>
                  <p>近七天观看</p>
                </div>
              </div>

              <div class="stats-chart-container">
                <div class="chart-box">
                  <h4>
                    <i class="fas fa-calendar-week" style="color:var(--sys-blue); margin-right:8px;"></i>
                    近7天观看统计
                  </h4>
                  <div ref="weeklyChartDom" class="chart-area"></div>
                </div>
                <div class="chart-box">
                  <h4>
                    <i class="fas fa-chart-line" style="color:var(--sys-blue); margin-right:8px;"></i>
                    {{ currentYear }}年度观看趋势
                  </h4>
                  <div ref="annualChartDom" class="chart-area"></div>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- 设置页面 -->
        <div v-if="activeTab === 'settings'" class="ios-section">
          <div class="ios-section-header desktop-only-setting">应用设置</div>
          
          <!-- 移动端，用户主页信息 (头像 + 昵称) -->
          <div class="mobile-user-profile mobile-only">
            <div class="mobile-avatar">
              <i class="fas fa-user"></i>
            </div>
            <h2 class="mobile-username">{{ username }}</h2>
            <!-- 账户身份铭牌：根据登录响应中的 demo 标识区分标准账户与演示账户。 -->
            <span :class="['account-role-badge', { 'is-demo': isDemoAccount }]">
              {{ accountRoleText }}
            </span>
          </div>

          <div class="chart-box desktop-only-setting" style="max-width: 600px;">
            <h4 style="margin-bottom: 15px;">
              <i class="fas fa-palette" style="color:var(--sys-blue); margin-right:8px;"></i>
              外观与背景
            </h4>
            <div class="settings-row">
              <div>
                <div class="settings-label">主页背景模式</div>
                <div class="settings-desc">切换应用的基础背景风格</div>
              </div>
              <div class="bg-toggle-group">
                <label
                  v-for="opt in bgOptions"
                  :key="opt.value"
                  class="bg-radio"
                >
                  <input
                    type="radio"
                    name="bgTheme"
                    :value="opt.value"
                    :checked="appStore.bgTheme === opt.value"
                    @change="handleThemeChange(opt.value)"
                  />
                  <span>{{ opt.label }}</span>
                </label>
              </div>
              </div>
              </div>

          <!-- 桌面端演示账户配置区，普通账户可在设置页直接管理 -->
          <div class="chart-box desktop-only-setting demo-account-box" style="max-width: 600px;">
            <h4 style="margin-bottom: 15px;">
              <i class="fas fa-user-shield" style="color:var(--sys-blue); margin-right:8px;"></i>
              演示账户
            </h4>

            <div v-if="isDemoAccount" class="demo-account-notice">
              当前为演示账户，仅可浏览数据，不能管理演示账户。
            </div>

            <template v-else>
              <div class="settings-row demo-summary-row">
                <div>
                  <div class="settings-label">演示账户状态</div>
                  <div class="settings-desc">
                    {{ demoAccount ? `已开启：${demoAccount.username}` : '未开启，创建后可用于给访客演示系统' }}
                  </div>
                </div>
                <span :class="['demo-status-pill', demoAccount ? 'enabled' : 'disabled']">
                  {{ demoAccount ? '已开启' : '未开启' }}
                </span>
              </div>

              <div v-if="demoLoading" class="demo-loading">正在读取演示账户状态...</div>

              <form v-else-if="!demoAccount" class="demo-form" @submit.prevent="handleCreateDemoUser">
                <div class="demo-form-row">
                  <label class="demo-field">
                    <span>演示用户名</span>
                    <input
                      v-model="demoCreateForm.username"
                      type="text"
                      maxlength="10"
                      autocomplete="username"
                      :disabled="demoSubmitting"
                      placeholder="最多 10 个字符"
                    />
                  </label>
                  <label class="demo-field">
                    <span>演示密码</span>
                    <input
                      v-model="demoCreateForm.password"
                      type="password"
                      minlength="6"
                      maxlength="72"
                      autocomplete="new-password"
                      :disabled="demoSubmitting"
                      placeholder="6-72 个字符"
                    />
                  </label>
                </div>
                <button type="submit" class="demo-primary-btn" :disabled="demoSubmitting">
                  <i :class="['fas', demoSubmitting ? 'fa-spinner fa-spin' : 'fa-toggle-on']"></i>
                  {{ demoSubmitting ? '开启中' : '开启演示账户' }}
                </button>
              </form>

              <div v-else class="demo-manage-area">
                <form class="demo-form" @submit.prevent="handleUpdateDemoPassword">
                  <label class="demo-field">
                    <span>新演示密码</span>
                    <input
                      v-model="demoPasswordForm.password"
                      type="password"
                      minlength="6"
                      maxlength="72"
                      autocomplete="new-password"
                      :disabled="demoPasswordSubmitting"
                      placeholder="输入新密码"
                    />
                  </label>
                  <button type="submit" class="demo-primary-btn" :disabled="demoPasswordSubmitting">
                    <i :class="['fas', demoPasswordSubmitting ? 'fa-spinner fa-spin' : 'fa-key']"></i>
                    {{ demoPasswordSubmitting ? '修改中' : '修改密码' }}
                  </button>
                </form>
                <button class="demo-danger-btn" :disabled="demoDeleting" @click="handleDeleteDemoUser">
                  <i :class="['fas', demoDeleting ? 'fa-spinner fa-spin' : 'fa-trash']"></i>
                  {{ demoDeleting ? '删除中' : '删除演示账户' }}
                </button>
              </div>
            </template>
          </div>

              <!-- 仅限移动设备，访问统计数据、关于和注销页面 -->
              <div class="mobile-settings-entrances">
              <div class="settings-row entrance-row" @click="handleTabChange({ key: 'stats', label: '数据统计' })">
              <div class="entrance-left">
                <i class="fas fa-chart-bar entrance-icon" style="color:var(--sys-blue);"></i>
                <span class="settings-label">数据统计</span>
              </div>
              <i class="fas fa-chevron-right entrance-arrow"></i>
              </div>
              <div class="settings-row entrance-row" @click="handleTabChange({ key: 'about', label: '关于应用' })">
              <div class="entrance-left">
                <i class="fas fa-info-circle entrance-icon" style="color:var(--sys-blue);"></i>
                <span class="settings-label">关于应用</span>
              </div>
              <i class="fas fa-chevron-right entrance-arrow"></i>
              </div>
              <div
                v-if="!isDemoAccount"
                class="settings-row entrance-row"
                @click="handleTabChange({ key: 'demo-user', label: '演示账户' })"
              >
              <div class="entrance-left">
                <i class="fas fa-user-shield entrance-icon" style="color:var(--sys-blue);"></i>
                <span class="settings-label">演示账户</span>
              </div>
              <i class="fas fa-chevron-right entrance-arrow"></i>
              </div>
              <div class="settings-row entrance-row destructive-row" @click="handleLogout">
              <div class="entrance-left">
                <i class="fas fa-sign-out-alt entrance-icon"></i>
                <span class="settings-label">退出登录</span>
              </div>
              </div>
              </div>
              </div>

        <!-- 关于页面 -->
        <transition name="mobile-modal">
          <div v-if="activeTab === 'about'" class="mobile-fullscreen-modal ios-section">
            <div class="modal-topbar mobile-only">
              <button class="modal-back-btn" @click="handleTabChange({ key: 'settings', label: '我的' })">
                <i class="fas fa-arrow-left"></i>
              </button>
              <span class="modal-title">关于应用</span>
            </div>
            <div class="modal-scroll-content">
              <div class="about-grid">
                <!-- 关于 -->
                <div class="about-card">
                  <h3 class="about-card-title">
                    <i class="fas fa-info-circle"></i> 关于
                  </h3>
                  <p class="about-intro">
                    {{ APP_CONFIG.appName }} 是一款动漫追番记录管理工具，帮助用户追踪已看完、最喜欢和正在追的动漫作品。
                    支持封面图片上传、分类筛选、数据数据统计等功能。
                  </p>
                </div>

                <!-- 项目信息 -->
                <div class="about-card">
                  <h3 class="about-card-title">
                    <i class="fas fa-clipboard-list"></i> 项目信息
                  </h3>
                  <table class="about-table">
                    <tr><td class="about-td-label">版本号</td><td>{{ APP_CONFIG.version }}</td></tr>
                    <tr><td class="about-td-label">发布时间</td><td>{{ APP_CONFIG.releaseDate }}</td></tr>
                    <tr><td class="about-td-label">技术栈</td><td>{{ APP_CONFIG.techStack }}</td></tr>
                    <tr><td class="about-td-label">运行环境</td><td>生产环境 (Production)</td></tr>
                    <tr><td class="about-td-label">开发者</td><td>{{ APP_CONFIG.author }}</td></tr>
                    <tr><td class="about-td-label">开源地址</td><td><a :href="APP_CONFIG.github" target="_blank" rel="noopener noreferrer">{{ APP_CONFIG.github }}</a></td></tr>
                  </table>
                </div>

                <!-- 生产环境依赖 -->
                <div class="about-card">
                  <h3 class="about-card-title">
                    <i class="fas fa-cubes"></i> 生产环境依赖
                  </h3>
                  <table class="about-table">
                    <tr v-for="dep in deps" :key="dep.name">
                      <td class="about-td-label">{{ dep.name }}</td>
                      <td>{{ dep.version }}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- 移动端演示账户二级配置页 -->
        <transition name="mobile-modal">
          <div v-if="activeTab === 'demo-user'" class="mobile-fullscreen-modal ios-section">
            <div class="modal-topbar mobile-only">
              <button class="modal-back-btn" @click="handleTabChange({ key: 'settings', label: '我的' })">
                <i class="fas fa-arrow-left"></i>
              </button>
              <span class="modal-title">演示账户</span>
            </div>
            <div class="modal-scroll-content">
              <div class="demo-mobile-card">
                <div class="demo-mobile-head">
                  <i class="fas fa-user-shield"></i>
                  <div>
                    <h3>演示账户配置</h3>
                    <p>用于给访客临时体验系统，只允许查看数据。</p>
                  </div>
                </div>

                <div v-if="demoLoading" class="demo-loading">正在读取演示账户状态...</div>

                <template v-else>
                  <div class="demo-mobile-status">
                    <span>当前状态</span>
                    <strong>{{ demoAccount ? `已开启：${demoAccount.username}` : '未开启' }}</strong>
                  </div>

                  <form v-if="!demoAccount" class="demo-form" @submit.prevent="handleCreateDemoUser">
                    <label class="demo-field">
                      <span>演示用户名</span>
                      <input
                        v-model="demoCreateForm.username"
                        type="text"
                        maxlength="10"
                        autocomplete="username"
                        :disabled="demoSubmitting"
                        placeholder="最多 10 个字符"
                      />
                    </label>
                    <label class="demo-field">
                      <span>演示密码</span>
                      <input
                        v-model="demoCreateForm.password"
                        type="password"
                        minlength="6"
                        maxlength="72"
                        autocomplete="new-password"
                        :disabled="demoSubmitting"
                        placeholder="6-72 个字符"
                      />
                    </label>
                    <button type="submit" class="demo-primary-btn" :disabled="demoSubmitting">
                      <i :class="['fas', demoSubmitting ? 'fa-spinner fa-spin' : 'fa-toggle-on']"></i>
                      {{ demoSubmitting ? '开启中' : '开启演示账户' }}
                    </button>
                  </form>

                  <div v-else class="demo-manage-area">
                    <form class="demo-form" @submit.prevent="handleUpdateDemoPassword">
                      <label class="demo-field">
                        <span>新演示密码</span>
                        <input
                          v-model="demoPasswordForm.password"
                          type="password"
                          minlength="6"
                          maxlength="72"
                          autocomplete="new-password"
                          :disabled="demoPasswordSubmitting"
                          placeholder="输入新密码"
                        />
                      </label>
                      <button type="submit" class="demo-primary-btn" :disabled="demoPasswordSubmitting">
                        <i :class="['fas', demoPasswordSubmitting ? 'fa-spinner fa-spin' : 'fa-key']"></i>
                        {{ demoPasswordSubmitting ? '修改中' : '修改密码' }}
                      </button>
                    </form>
                    <button class="demo-danger-btn" :disabled="demoDeleting" @click="handleDeleteDemoUser">
                      <i :class="['fas', demoDeleting ? 'fa-spinner fa-spin' : 'fa-trash']"></i>
                      {{ demoDeleting ? '删除中' : '删除演示账户' }}
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </main>

    <!-- 动漫详情弹窗 -->
    <AnimeModal
      :visible="detailVisible"
      :anime="currentAnime"
      :source-rect="sourceRect"
      :source-img="sourceImg"
      @close="detailVisible = false"
    />

    <!-- 移动端底部导航栏 -->
    <AppBottomBar :active-tab="activeTab" @tab-change="handleTabChange" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { animate, cubicBezier } from 'animejs';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppBottomBar from '@/components/layout/AppBottomBar.vue';
import AnimeCard from '@/components/common/AnimeCard.vue';
import AnimeModal from '@/components/common/AnimeModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { animeApi, demoUserApi } from '@/api/anime';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { APP_CONFIG } from '@/utils/constants';
import { useNotify } from '@/composables/useNotify';

/** 动态导入echarts以减小主chunk体积 */
let echartsModule = null;
async function loadECharts() {
  if (!echartsModule) {
    try {
      echartsModule = await import('echarts');
    } catch {
      return null;
    }
  }
  return echartsModule;
}

const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();
const { message, confirm } = useNotify();

const username = computed(() => authStore.username);
const isDemoAccount = computed(() => authStore.isDemo);
const accountRoleText = computed(() => (isDemoAccount.value ? '演示账户' : '标准账户/管理员'));

const activeTab = ref('finished');
const loading = ref(false);
const pageTitle = ref('已看完');
const detailVisible = ref(false);
const currentAnime = ref(null);
const sourceRect = ref(null);
const sourceImg = ref(null);
const currentYear = new Date().getFullYear();

/** 演示账户用户名最大长度，与后端校验保持一致 */
const DEMO_USERNAME_MAX_LENGTH = 10;

/** 演示账户密码长度范围，与 BCrypt 安全上限保持一致 */
const DEMO_PASSWORD_MIN_LENGTH = 6;
const DEMO_PASSWORD_MAX_LENGTH = 72;

/** 控制字符检测，避免换行或不可见字符进入账号凭证 */
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/u;

/** 演示账户基础信息，仅保存后端可回显字段，不保存密码 */
const demoAccount = ref(null);
const demoLoading = ref(false);
const demoSubmitting = ref(false);
const demoPasswordSubmitting = ref(false);
const demoDeleting = ref(false);

/** 创建演示账户表单 */
const demoCreateForm = reactive({
  username: '',
  password: ''
});

/** 修改演示密码表单 */
const demoPasswordForm = reactive({
  password: ''
});

/** 退出登录逻辑（专为移动端使用） */
async function handleLogout() {
  const isConfirm = await confirm({ content: '确定要退出登录吗？' });
  if (!isConfirm) return;

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: '#fff',
    zIndex: '99999',
    opacity: '0'
  });
  document.body.appendChild(overlay);

  const ease = cubicBezier(0.4, 0, 0.2, 1);

  animate(overlay, {
    opacity: [0, 1],
    duration: 350,
    ease,
    onComplete: () => {
      authStore.logout();
      router.push('/login');
    }
  });
}

/**
 * @function extractApiMessage
 * @description 统一提取后端返回文本，避免对象直接展示到页面。
 * @param {unknown} err - Axios异常或普通异常
 * @param {string} fallback - 兜底提示
 * @returns {string} 可展示的错误文案
 */
function extractApiMessage(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  if (typeof data?.message === 'string') return data.message;
  return fallback;
}

/**
 * @function validateDemoUsername
 * @description 校验演示用户名，规则与后端接口文档保持一致。
 * @param {string} value - 已裁剪空白的用户名
 * @returns {string} 为空表示校验通过
 */
function validateDemoUsername(value) {
  if (!value) return '请输入演示用户名';
  if (value.length > DEMO_USERNAME_MAX_LENGTH) {
    return `演示用户名不能超过 ${DEMO_USERNAME_MAX_LENGTH} 个字符`;
  }
  if (CONTROL_CHAR_PATTERN.test(value)) {
    return '演示用户名不能包含换行或不可见字符';
  }
  return '';
}

/**
 * @function validateDemoPassword
 * @description 校验演示密码，限制明文长度并阻断不可见字符。
 * @param {string} value - 密码原文
 * @returns {string} 为空表示校验通过
 */
function validateDemoPassword(value) {
  if (!value.trim()) return '请输入演示密码';
  if (value.length < DEMO_PASSWORD_MIN_LENGTH || value.length > DEMO_PASSWORD_MAX_LENGTH) {
    return `演示密码长度需为 ${DEMO_PASSWORD_MIN_LENGTH}-${DEMO_PASSWORD_MAX_LENGTH} 个字符`;
  }
  if (CONTROL_CHAR_PATTERN.test(value)) {
    return '演示密码不能包含换行或不可见字符';
  }
  return '';
}

/** 清理演示账户创建表单，减少明文密码在页面中的滞留时间 */
function resetDemoCreateForm() {
  demoCreateForm.username = '';
  demoCreateForm.password = '';
}

/** 清理演示密码修改表单 */
function resetDemoPasswordForm() {
  demoPasswordForm.password = '';
}

/**
 * @function loadDemoAccount
 * @description 获取演示账户状态。404 表示尚未开启，不作为错误打扰用户。
 * @param {boolean} silent - 是否静默处理非 404 错误
 * @returns {Promise<void>}
 */
async function loadDemoAccount(silent = false) {
  if (isDemoAccount.value || demoLoading.value) return;

  demoLoading.value = true;
  try {
    const response = await demoUserApi.getDemoUser();
    demoAccount.value = response.data || null;
  } catch (err) {
    if (err?.response?.status === 404) {
      demoAccount.value = null;
      return;
    }

    if (!silent) {
      message({ content: extractApiMessage(err, '演示账户状态读取失败'), type: 'error' });
    }
  } finally {
    demoLoading.value = false;
  }
}

/**
 * @function handleCreateDemoUser
 * @description 创建演示账户，后端仅允许存在一个演示账户。
 * @returns {Promise<void>}
 */
async function handleCreateDemoUser() {
  if (isDemoAccount.value || demoSubmitting.value) return;

  const normalizedUsername = demoCreateForm.username.trim();
  const usernameMessage = validateDemoUsername(normalizedUsername);
  const passwordMessage = validateDemoPassword(demoCreateForm.password);

  if (usernameMessage || passwordMessage) {
    message({ content: usernameMessage || passwordMessage, type: 'error' });
    return;
  }

  demoSubmitting.value = true;
  try {
    const response = await demoUserApi.createDemoUser(normalizedUsername, demoCreateForm.password);
    demoAccount.value = response.data || { username: normalizedUsername, demo: true };
    resetDemoCreateForm();
    message({ content: '演示账户已开启', type: 'success' });
  } catch (err) {
    if (err?.response?.status === 409) {
      await loadDemoAccount(true);
    }
    message({ content: extractApiMessage(err, '演示账户创建失败'), type: 'error' });
  } finally {
    demoSubmitting.value = false;
  }
}

/**
 * @function handleUpdateDemoPassword
 * @description 修改演示账户密码，仅提交新密码，不在前端展示或保存。
 * @returns {Promise<void>}
 */
async function handleUpdateDemoPassword() {
  if (isDemoAccount.value || demoPasswordSubmitting.value || !demoAccount.value) return;

  const passwordMessage = validateDemoPassword(demoPasswordForm.password);
  if (passwordMessage) {
    message({ content: passwordMessage, type: 'error' });
    return;
  }

  demoPasswordSubmitting.value = true;
  try {
    const response = await demoUserApi.updateDemoPassword(demoPasswordForm.password);
    resetDemoPasswordForm();
    message({
      content: typeof response.data === 'string' ? response.data : '演示账户密码修改成功',
      type: 'success'
    });
  } catch (err) {
    if (err?.response?.status === 404) {
      demoAccount.value = null;
      resetDemoPasswordForm();
    }
    message({ content: extractApiMessage(err, '演示账户密码修改失败'), type: 'error' });
  } finally {
    demoPasswordSubmitting.value = false;
  }
}

/**
 * @function handleDeleteDemoUser
 * @description 删除演示账户。删除后该账号将无法继续登录，操作前必须二次确认。
 * @returns {Promise<void>}
 */
async function handleDeleteDemoUser() {
  if (isDemoAccount.value || demoDeleting.value || !demoAccount.value) return;

  const isConfirm = await confirm({
    title: '删除演示账户',
    content: `确定要删除演示账户「${demoAccount.value.username}」吗？删除后该账号将无法继续登录。`,
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger'
  });
  if (!isConfirm) return;

  demoDeleting.value = true;
  try {
    const response = await demoUserApi.deleteDemoUser();
    demoAccount.value = null;
    resetDemoPasswordForm();
    message({
      content: typeof response.data === 'string' ? response.data : '演示账户已删除',
      type: 'success'
    });
  } catch (err) {
    if (err?.response?.status === 404) {
      demoAccount.value = null;
      resetDemoPasswordForm();
    }
    message({ content: extractApiMessage(err, '演示账户删除失败'), type: 'error' });
  } finally {
    demoDeleting.value = false;
  }
}

/** 图表DOM引用 */
const weeklyChartDom = ref(null);
const annualChartDom = ref(null);
let weeklyChart = null;
let annualChart = null;

/** 背景选项 */
const bgOptions = [
  { value: 'solid', label: '纯白' },
  { value: 'image', label: '壁纸' }
];

/** 生产环境依赖列表 */
const deps = [
  { name: 'vue', version: '3.4.27' },
  { name: 'vue-router', version: '4.3.2' },
  { name: 'pinia', version: '2.1.7' },
  { name: 'axios', version: '1.7.2' },
  { name: 'echarts', version: '5.5.0' },
  { name: 'animejs', version: '4.4.1' },
  { name: 'vite', version: '5.2.11' }
];

/** Keep-Alive数据缓存 */
const cachedData = reactive({
  finished: null,
  favorite: null,
  watching: null,
  stats: null
});

/**
 * @function isMobileViewport
 * @description 判断当前是否处于移动端布局断点，用于区分“我的”和桌面“设置”的数据请求策略。
 * @returns {boolean} 是否为移动端视口
 */
function isMobileViewport() {
  return window.innerWidth <= 768;
}

/**
 * 处理Tab切换
 */
function handleTabChange(item) {
  activeTab.value = item.key;
  pageTitle.value = item.label;

  // 滚动到顶部
  const main = document.querySelector('.app-main');
  if (main) main.scrollTop = 0;

  if (item.key === 'demo-user' || (item.key === 'settings' && !isMobileViewport())) {
    loadDemoAccount(true);
  }

  // 检查缓存
  if (!cachedData[item.key]) {
    loadTabData(item.key);
  } else if (item.key === 'stats') {
    // 统计页需要重新渲染图表
    nextTick(() => {
      renderCharts();
    });
  }
}

/**
 * 加载各Tab数据
 */
async function loadTabData(tabName) {
  loading.value = true;

  try {
    if (tabName === 'stats') {
      const [mainRes, weeklyRes, annualRes] = await Promise.all([
        animeApi.getStatsMain(),
        animeApi.getStatsWeekly(),
        animeApi.getStatsAnnual()
      ]);

      let lastSevenDaysTotal = 0;
      if (weeklyRes.data && weeklyRes.data.values) {
        lastSevenDaysTotal = weeklyRes.data.values.reduce((s, c) => s + c, 0);
      }

      cachedData.stats = {
        totalFinished: mainRes.data.totalFinished || 0,
        totalFavorite: mainRes.data.totalFavorite || 0,
        totalWatching: mainRes.data.totalWatching || 0,
        lastSevenDaysTotal,
        weeklyLabels: weeklyRes.data.labels || [],
        weeklyValues: weeklyRes.data.values || [],
        annualLabels: annualRes.data.labels || [],
        annualValues: annualRes.data.values || []
      };

      nextTick(() => {
        renderCharts();
      });
    } else if (tabName === 'about' || tabName === 'settings' || tabName === 'demo-user') {
      // 无需加载数据
    } else {
      const res = await animeApi.getMainList(tabName);
      cachedData[tabName] = res.data;
    }
  } catch (err) {
    message({ content: '数据加载失败，请检查网络或后端服务', type: 'error' });
  } finally {
    loading.value = false;
  }
}

/**
 * 渲染ECharts图表
 */
async function renderCharts() {
  if (!cachedData.stats) return;

  const weeklyDom = weeklyChartDom.value;
  const annualDom = annualChartDom.value;

  if (weeklyDom) {
    await renderChart(weeklyDom, cachedData.stats.weeklyLabels, cachedData.stats.weeklyValues, 'rgba(106, 90, 205, 1)', 'rgba(106, 90, 205, 0.05)', ref(weeklyChart));
  }
  if (annualDom) {
    await renderChart(annualDom, cachedData.stats.annualLabels, cachedData.stats.annualValues, 'rgba(37, 99, 235, 1)', 'rgba(37, 99, 235, 0.05)', ref(annualChart));
  }
}

/**
 * 渲染单个图表（异步加载echarts）
 */
async function renderChart(dom, labels, values, colorTop, colorBottom, instanceRef) {
  if (!dom) return;

  const echarts = await loadECharts();
  if (!echarts) return;

  // 销毁旧实例
  if (instanceRef.value) {
    instanceRef.value.dispose();
    instanceRef.value = null;
  }

  const chart = echarts.init(dom);
  instanceRef.value = chart;

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(0,0,0,0.1)',
      textStyle: { color: '#1d1d1f' }
    },
    grid: {
      top: '15%',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#5e5e63' }
    },
    yAxis: {
      type: 'value',
      splitLine: {
        lineStyle: { type: 'dashed', color: 'rgba(0,0,0,0.06)' }
      },
      axisLabel: { color: '#5e5e63' }
    },
    series: [
      {
        data: values,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3, color: colorTop },
        areaStyle: {
          opacity: 0.8,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colorTop },
            { offset: 1, color: colorBottom }
          ])
        }
      }
    ]
  };

  chart.setOption(option);
}

/**
 * 打开动漫详情弹窗
 * @param {Object} payload - { anime, sourceRect, sourceImg }
 */
function openDetail(payload) {
  currentAnime.value = payload.anime;
  sourceRect.value = payload.sourceRect;
  sourceImg.value = payload.sourceImg;
  detailVisible.value = true;
}

/**
 * 处理主题切换
 */
function handleThemeChange(theme) {
  appStore.setBgTheme(theme);
  if (theme === 'solid') {
    document.body.classList.add('theme-solid-color');
  } else {
    document.body.classList.remove('theme-solid-color');
  }
  message({ content: '外观设置已保存', type: 'success' });
}

// 初始化背景主题
onMounted(() => {
  // 移动端强制默认使用纯白背景
  if (window.innerWidth <= 768) {
    appStore.setBgTheme('solid');
  }

  if (appStore.bgTheme === 'solid') {
    document.body.classList.add('theme-solid-color');
  }
  // 加载默认Tab
  loadTabData('finished');
});

/**
 * 窗口resize时重绘图表（使用防抖）
 */
let resizeTimer = null;
function handleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (weeklyChart) weeklyChart.resize();
    if (annualChart) annualChart.resize();
  }, 200);
}

window.addEventListener('resize', handleResize);

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  clearTimeout(resizeTimer);
  // 销毁图表实例
  if (weeklyChart) {
    weeklyChart.dispose();
    weeklyChart = null;
  }
  if (annualChart) {
    annualChart.dispose();
    annualChart = null;
  }
});
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden; /* 绝对禁止横向滑动 */
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.content-section {
  padding: 0 50px 80px;
  width: 100%;
  box-sizing: border-box;
}

.ios-section {
  margin-bottom: 50px;
  width: 100%;
}

.ios-section-header {
  font-size: 24px;
  font-weight: 800;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding-bottom: 15px;
  margin-bottom: 25px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  width: 100%;
  overflow: hidden; /* 防止标题过长撑开容器 */
}

.ios-section-sub {
  font-size: 18px;
  color: var(--sys-blue);
  font-weight: 600;
}

.ios-section-count {
  font-size: 14px;
  color: var(--sys-text-secondary);
  font-weight: normal;
  margin-left: auto;
  background: rgba(255, 255, 255, 0.7);
  padding: 4px 12px;
  border-radius: 20px;
}

.anime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 30px 20px;
}

@media (max-width: 768px) {
  .anime-grid {
    /* 使用 minmax(0, 1fr) 强制平分空间，防止内容撑开列宽 */
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px 12px !important;
    width: 100%;
    margin: 0 auto;
  }
}

.empty-text {
  text-align: center;
  color: var(--sys-text-secondary);
  margin-top: 50px;
}

/* 数据统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 50px;
}

.stat-card {
  background: var(--liquid-surface);
  border-radius: 24px;
  padding: 30px;
  border: 1px solid var(--liquid-border);
  box-shadow: var(--liquid-shadow), var(--liquid-highlight);
  text-align: center;
  transition: 0.4s;
}

.stat-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.23);
}

.stat-card i {
  font-size: 36px;
  color: var(--sys-blue);
  margin-bottom: 16px;
}

.stat-card h3 {
  font-size: 40px;
  font-weight: 800;
  margin-bottom: 4px;
  color: var(--sys-text-primary);
}

.stat-card p {
  font-size: 15px;
  color: var(--sys-text-secondary);
}

.stats-chart-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.chart-box {
  background: rgba(255, 255, 255, 0.55);
  border-radius: 24px;
  padding: 30px;
  border: 1px solid var(--liquid-border);
  box-shadow: var(--liquid-shadow), var(--liquid-highlight);
}

.chart-box h4 {
  font-size: 18px;
  margin-bottom: 20px;
  font-weight: 700;
  color: var(--sys-text-primary);
}

.chart-area {
  width: 100%;
  height: 260px;
}

/* 设置页 */
.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.settings-label {
  font-weight: 600;
  color: var(--sys-text-primary);
}

.settings-desc {
  font-size: 12px;
  color: var(--sys-text-secondary);
  margin-top: 4px;
}

.bg-toggle-group {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 4px;
  gap: 4px;
}

.bg-radio {
  cursor: pointer;
  margin: 0;
}

.bg-radio input {
  display: none;
}

.bg-radio span {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--sys-text-secondary);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bg-radio input:checked + span {
  background: #ffffff;
  color: var(--sys-text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 演示账户设置 */
.demo-account-box {
  margin-top: 24px;
}

.demo-summary-row {
  gap: 20px;
}

.demo-status-pill {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.demo-status-pill.enabled {
  color: #0f7a3a;
  background: rgba(52, 199, 89, 0.14);
}

.demo-status-pill.disabled {
  color: var(--sys-text-secondary);
  background: rgba(0, 0, 0, 0.06);
}

.demo-account-notice,
.demo-loading {
  padding: 14px 0;
  color: var(--sys-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.demo-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
}

.demo-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.demo-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: var(--sys-text-primary);
  font-size: 13px;
  font-weight: 700;
}

.demo-field input {
  width: 100%;
  height: 38px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--sys-text-primary);
  font-size: 14px;
  outline: none;
  padding: 0 12px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.demo-field input:focus {
  border-color: rgba(0, 122, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12);
  background: #ffffff;
}

.demo-field input:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.demo-primary-btn,
.demo-danger-btn {
  height: 38px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.demo-primary-btn {
  background: var(--sys-blue);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(0, 122, 255, 0.18);
}

.demo-primary-btn:hover,
.demo-primary-btn:focus-visible {
  background: #005ecb;
  transform: translateY(-1px);
  outline: none;
}

.demo-danger-btn {
  width: 100%;
  margin-top: 12px;
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.demo-danger-btn:hover,
.demo-danger-btn:focus-visible {
  background: rgba(255, 59, 48, 0.16);
  transform: translateY(-1px);
  outline: none;
}

.demo-primary-btn:disabled,
.demo-danger-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  transform: none;
  box-shadow: none;
}

.demo-manage-area {
  margin-top: 18px;
}

.demo-mobile-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
}

.demo-mobile-head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}

.demo-mobile-head > i {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(0, 122, 255, 0.1);
  color: var(--sys-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.demo-mobile-head h3 {
  margin: 0 0 6px;
  font-size: 17px;
  color: var(--sys-text-primary);
}

.demo-mobile-head p {
  margin: 0;
  color: var(--sys-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.demo-mobile-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  color: var(--sys-text-secondary);
  font-size: 14px;
}

.demo-mobile-status strong {
  color: var(--sys-text-primary);
  text-align: right;
  word-break: break-word;
}

/* 关于页 */
.about-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.about-card {
  background: var(--liquid-surface);
  border-radius: 24px;
  border: 1px solid var(--liquid-border);
  box-shadow: var(--liquid-shadow), var(--liquid-highlight);
  padding: 32px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.about-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.about-card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--sys-text-primary);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.about-card-title i {
  color: var(--sys-blue);
  font-size: 18px;
}

.about-intro {
  font-size: 15px;
  line-height: 1.8;
  color: var(--sys-text-secondary);
}

.about-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.about-table tr {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.about-table tr:last-child {
  border-bottom: none;
}

.about-table td {
  padding: 12px 0;
  color: var(--sys-text-primary);
}

.about-td-label {
  width: 140px;
  color: var(--sys-text-secondary) !important;
  font-weight: 500;
  flex-shrink: 0;
}

.about-table a {
  color: var(--sys-blue);
  text-decoration: none;
}

/* 仅针对移动端的设计调整 */
.mobile-settings-entrances {
  display: none;
}

@media (max-width: 768px) {
  /* 调整主内容区的底部间距，为 AppBottomBar 预留空间 */
  .content-section {
    padding: 0 20px calc(80px + env(safe-area-inset-bottom)) !important;
  }
  
  /* 移动端隐藏外观设置 */
  .desktop-only-setting {
    display: none !important;
  }
  
  /* 移动端设置项独立入口容器 */
  .mobile-settings-entrances {
    display: flex;
    flex-direction: column;
    margin-top: 30px;
    gap: 15px;
  }
  
  /* 移动端：我的（用户主页头像与昵称） */
  .mobile-user-profile {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 0 10px;
  }
  
  .mobile-avatar {
    width: 86px;
    height: 86px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e0eafc, #cfdef3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sys-blue);
    font-size: 38px;
    border: 3px solid #fff;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    margin-bottom: 16px;
  }
  
  .mobile-username {
    font-size: 22px;
    font-weight: 800;
    color: var(--sys-text-primary);
    margin: 0;
  }

  .account-role-badge {
    margin-top: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    color: #0f7a3a;
    background: rgba(52, 199, 89, 0.14);
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
  }

  .account-role-badge.is-demo {
    color: #9a5a00;
    background: rgba(255, 149, 0, 0.16);
  }
  
  .entrance-row {
    background: rgba(255, 255, 255, 0.4);
    border-radius: 16px;
    padding: 16px 20px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    cursor: pointer;
    transition: all 0.2s ease;
    border-top: none; /* 移除普通 setting-row 的上边框 */
  }
  
  .entrance-row:active {
    transform: scale(0.98);
    background: rgba(255, 255, 255, 0.7);
  }

  .entrance-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .entrance-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
  }
  
  .entrance-arrow {
    color: var(--sys-text-secondary);
    font-size: 14px;
    opacity: 0.5;
  }
  
  .destructive-row {
    margin-top: 10px;
  }
  
  .destructive-row .entrance-icon,
  .destructive-row .settings-label {
    color: #ff3b30 !important;
  }
  
  /* 移动端全屏弹窗基础样式 (Stats & About) */
  .mobile-fullscreen-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #f5f5f7; /* 灰色背景 */
    z-index: 3000; /* 高于 AppBottomBar */
    display: flex;
    flex-direction: column;
    margin-bottom: 0 !important;
  }
  
  .modal-topbar {
    display: flex;
    align-items: center;
    /* 与主 Header 保持一致的加倍间距与高度 */
    padding: max(20px, calc(env(safe-area-inset-top) + 10px)) 20px 20px;
    min-height: 88px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0,0,0,0.05);
    z-index: 10;
    flex-shrink: 0;
    justify-content: center;
    position: relative;
  }
  
  .modal-back-btn {
    position: absolute;
    left: 20px;
    bottom: 19px; /* 根据50px按钮高度做垂直居中微调 */
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: rgba(0,0,0,0.05);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sys-blue);
    font-size: 24px;
    cursor: pointer;
  }
  
  .modal-title {
    font-size: 24px; /* 与主 Header 保持一致的字号 */
    font-weight: 700;
    color: var(--sys-text-primary);
  }
  
  .modal-scroll-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    padding-bottom: max(30px, env(safe-area-inset-bottom));
  }
  
  /* 移动端全屏弹窗滑入/滑出动画 */
  .mobile-modal-enter-active,
  .mobile-modal-leave-active {
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }
  .mobile-modal-enter-from,
  .mobile-modal-leave-to {
    transform: translateY(100%) !important;
  }
  
  /* 移动端数据统计页专项美化重构 */
  .stats-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 15px !important;
    margin-bottom: 30px !important;
  }
  
  .stat-card {
    padding: 20px 15px !important;
    border-radius: 20px !important;
    background: #ffffff !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04) !important;
    border: none !important;
  }
  
  .stat-card i {
    font-size: 28px !important;
    margin-bottom: 12px !important;
  }
  
  .stat-card h3 {
    font-size: 28px !important;
  }
  
  .stat-card p {
    font-size: 13px !important;
  }
  
  .stats-chart-container {
    grid-template-columns: 1fr !important;
    gap: 20px !important;
  }
  
  .chart-box {
    padding: 20px !important;
    border-radius: 20px !important;
    background: #ffffff !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04) !important;
    border: none !important;
  }

  .demo-form-row {
    grid-template-columns: 1fr;
  }

  .demo-field input,
  .demo-primary-btn,
  .demo-danger-btn {
    height: 44px;
    border-radius: 12px;
  }

  .demo-form {
    margin-top: 16px;
  }
  
  .chart-area {
    height: 220px !important;
  }
  
  .mobile-only {
    display: flex !important;
  }
}

@media (min-width: 769px) {
  .mobile-only {
    display: none !important;
  }
}
</style>
