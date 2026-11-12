<template>
  <div class="app-container">
    <AppSidebar :active-tab="activeTab" :counts="tabCounts" @tab-change="handleTabChange" />
    <section class="workspace">
      <WorkspaceTabs :active-tab="activeTab" :counts="tabCounts" @change="handleTabChange" />
      <main
        id="workspace-panel"
        class="app-main"
        :class="{ 'management-main': activeTab === 'admin' }"
        ref="mainContainer"
        role="tabpanel"
        tabindex="0"
        :aria-labelledby="'tab-' + activeTab"
      >
        <AppHeader
          v-if="activeTab !== 'admin'"
          :title="pageTitle"
          :description="currentTab.description"
          :count="tabCounts[activeTab]"
          :loading="loading"
          @refresh="refreshActiveTab"
        />
        <div
          class="content-section"
          :class="{ 'management-content': activeTab === 'admin' }"
          ref="contentSection"
        >
          <LoadingSpinner v-if="loading" />
          <div v-if="loadError" class="workspace-error" role="alert">
            <span>{{ loadError }}</span><button class="subtle-button" @click="refreshActiveTab">
              重试
            </button>
          </div>
          <template v-if="isLibraryTab && currentLibraryData">
            <div v-if="activeTab === 'finished'" class="collection-banner">
              <div class="banner-copy">
                <span>STORIES THAT STAY WITH YOU</span>
                <h2>与喜欢的故事，再次相遇。</h2>
                <p>一部动漫，一段时光。这里是你的私人收藏室。</p>
              </div>
              <span class="banner-mark">物語のつづき</span>
            </div>
            <VirtualAnimeLibrary :key="activeTab" :groups="libraryGroups" @select="openDetail" />
          </template>
          <KeepAlive
            ><AdminView
              v-if="activeTab === 'admin'"
              ref="adminView"
              @data-changed="invalidateLibrary"
          /></KeepAlive>
          <div v-if="activeTab === 'stats' && cachedData.stats" class="stats-dashboard-page">
            <div class="stats-dashboard-shell">
              <header class="stats-dashboard-header">
                <div class="stats-title-group">
                  <h2>数据统计</h2>
                  <p>查看你的动漫观看档案</p>
                </div>
              </header>
              <div class="modal-scroll-content stats-dashboard-scroll">
                <section class="stats-overview-grid" aria-label="动漫观看总览">
                  <article class="stats-total-card">
                    <span class="stats-card-label">累计已看</span>
                    <div class="stats-total-value">
                      <strong>{{ statsSummary.totalFinished }}</strong>
                      <span>部</span>
                    </div>
                    <p class="stats-total-note">
                      <i class="fas fa-star" aria-hidden="true"></i>
                      这是你与动漫相伴的每一天！
                      <i class="fas fa-star" aria-hidden="true"></i>
                    </p>
                  </article>
                  <div class="stats-mini-grid">
                    <article
                      v-for="item in statsMetricCards"
                      :key="item.key"
                      class="stats-mini-card"
                    >
                      <span :class="['stats-icon-badge', item.tone]">
                        <i :class="item.icon" aria-hidden="true"></i>
                      </span>
                      <span class="stats-mini-label">{{ item.label }}</span>
                      <strong
                        >{{ item.value }} <small>{{ item.unit }}</small></strong
                      >
                      <p>{{ item.desc }}</p>
                    </article>
                  </div>
                </section>
                <section class="stats-chart-grid" aria-label="动漫观看趋势">
                  <article class="stats-chart-card">
                    <div class="stats-card-heading">
                      <h3>
                        <i class="fas fa-chart-simple" aria-hidden="true"></i>
                        近7天观看部数
                      </h3>
                    </div>
                    <p class="stats-chart-desc">
                      近7天共观看
                      <strong>{{ statsSummary.weeklyTotal }}</strong>
                      部，最高单日
                      <strong>{{ statsSummary.weeklyPeak }}</strong>
                      部
                    </p>
                    <div ref="weeklyChartDom" class="stats-chart-area"></div>
                  </article>
                  <article class="stats-chart-card">
                    <div class="stats-card-heading">
                      <h3>
                        <i class="fas fa-chart-column" aria-hidden="true"></i>
                        {{ currentYear }}
                        年度观看趋势
                      </h3>
                      <span class="stats-chart-pill">部数</span>
                    </div>
                    <div ref="annualChartDom" class="stats-chart-area"></div>
                  </article>
                </section>
                <section class="stats-report-card" aria-label="年度观看报告">
                  <div class="stats-report-content">
                    <h3>
                      <i class="fas fa-award" aria-hidden="true"></i>
                      {{ currentYear }}
                      年观看报告
                    </h3>
                    <div class="stats-report-grid">
                      <div class="stats-report-item">
                        <span class="report-icon blue"
                          ><i class="fas fa-box-archive" aria-hidden="true"></i
                        ></span>
                        <p>看过</p>
                        <strong>{{ statsSummary.totalFinished }} <small>部动漫</small></strong>
                      </div>
                      <div class="stats-report-item">
                        <span class="report-icon purple"
                          ><i class="fas fa-book-open" aria-hidden="true"></i
                        ></span>
                        <p>共观看</p>
                        <strong>{{ statsSummary.annualTotal }} <small>部</small></strong>
                      </div>
                      <div class="stats-report-item">
                        <span class="report-icon cyan"
                          ><i class="fas fa-calendar-check" aria-hidden="true"></i
                        ></span>
                        <p>最活跃的月份是</p>
                        <strong>{{ statsSummary.peakMonth }}</strong>
                      </div>
                    </div>
                  </div>
                  <div class="stats-report-art" aria-hidden="true"></div>
                </section>
                <button
                  class="stats-timeline-entry"
                  type="button"
                  :style="timelineEntryStyle"
                  aria-label="打开时间线模式"
                  @click="openTimelineMode"
                >
                  <span class="timeline-entry-copy">
                    <span class="timeline-entry-kicker">各年度观看报告</span>
                    <strong>时间线模式</strong>
                    <small>以月份穿梭你的已看完档案</small>
                  </span>
                  <span class="timeline-entry-action" aria-hidden="true">
                    <i class="fas fa-arrow-right"></i>
                  </span>
                </button>
              </div>
            </div>
          </div>
          <p v-if="activeTab === 'stats' && !loading && !cachedData.stats" class="empty-text">
            暂无统计数据
          </p>
          <div v-if="activeTab === 'settings'" class="ios-section">
            <AppearanceSettings />
            <section class="demo-account-box" aria-labelledby="demo-account-title">
              <div class="demo-heading">
                <i class="fa-solid fa-user-shield" aria-hidden="true"></i>
                <div>
                  <h3 id="demo-account-title">演示账户</h3>
                  <p>为访客提供只读访问，浏览你的动漫收藏。</p>
                </div>
              </div>
              <div v-if="isDemoAccount" class="demo-account-notice">
                当前为演示账户，仅可浏览数据，不能管理演示账户。
              </div>
              <template v-else>
                <div class="settings-row demo-summary-row">
                  <div>
                    <div class="settings-label">演示账户状态</div>
                    <div class="settings-desc">
                      {{
                        demoAccount
                          ? `已开启：${demoAccount.username}`
                          : '未开启，创建后可用于给访客演示系统'
                      }}
                    </div>
                  </div>
                  <span :class="['demo-status-pill', demoAccount ? 'enabled' : 'disabled']">
                    {{ demoAccount ? '已开启' : '未开启' }}
                  </span>
                </div>
                <div v-if="demoLoading" class="demo-loading">正在读取演示账户状态...</div>
                <form
                  v-else-if="!demoAccount"
                  class="demo-form"
                  @submit.prevent="handleCreateDemoUser"
                >
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
                  <button
                    type="submit"
                    class="workbench-button is-primary demo-primary-btn"
                    :disabled="demoSubmitting"
                  >
                    <i
                      :class="['fas', demoSubmitting ? 'fa-spinner fa-spin' : 'fa-toggle-on']"
                      aria-hidden="true"
                    ></i>
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
                    <button
                      type="submit"
                      class="workbench-button is-primary demo-primary-btn"
                      :disabled="demoPasswordSubmitting"
                    >
                      <i
                        :class="['fas', demoPasswordSubmitting ? 'fa-spinner fa-spin' : 'fa-key']"
                        aria-hidden="true"
                      ></i>
                      {{ demoPasswordSubmitting ? '修改中' : '修改密码' }}
                    </button>
                  </form>
                  <button
                    class="workbench-button is-danger demo-danger-btn"
                    :disabled="demoDeleting"
                    @click="handleDeleteDemoUser"
                  >
                    <i
                      :class="['fas', demoDeleting ? 'fa-spinner fa-spin' : 'fa-trash']"
                      aria-hidden="true"
                    ></i>
                    {{ demoDeleting ? '删除中' : '删除演示账户' }}
                  </button>
                </div>
              </template>
            </section>
          </div>
          <AboutApp v-if="activeTab === 'about'" class="ios-section" />
        </div>
      </main>
    </section>
    <AnimeModal
      :visible="detailVisible"
      :anime="currentAnime"
      :source-rect="sourceRect"
      :source-img="sourceImg"
      @close="detailVisible = false"
    />
    <AnimeTimelineMode v-if="timelineModeVisible" @close="closeTimelineMode" />
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  shallowReactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  defineAsyncComponent
} from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import VirtualAnimeLibrary from '@/components/common/VirtualAnimeLibrary.vue';
import WorkspaceTabs from '@/components/layout/WorkspaceTabs.vue';
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue';
import { getWorkspaceTab } from '@/utils/workspace';
import AnimeModal from '@/components/common/AnimeModal.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import { animeApi, demoUserApi } from '@/api/anime';
import { useAuthStore } from '@/stores/auth';
import AboutApp from '@/components/common/AboutApp.vue';
import { useNotify } from '@/composables/useNotify';
const timelineBgUrl = '/img/timeline.webp';

/** 动态导入echarts以减小主chunk体积 */
let echartsModule = null;
async function loadECharts() {
  if (!echartsModule) {
    try {
      echartsModule = await import('@/utils/charts');
    } catch {
      return null;
    }
  }
  return echartsModule;
}

const router = useRouter();
const route = useRoute();
const mainContainer = ref(null);
const adminView = ref(null);
const scrollPositions = new Map();
const loadError = ref('');
const summaryCounts = ref(null);
const AdminView = defineAsyncComponent(() => import('@/views/AdminView.vue'));
const authStore = useAuthStore();
const { message, confirm } = useNotify();
const AnimeTimelineMode = defineAsyncComponent(
  () => import('@/components/stats/AnimeTimelineMode.vue')
);

const isDemoAccount = computed(() => authStore.isDemo);

const activeTab = ref(getWorkspaceTab(route.query.view).key);
const currentTab = computed(() => getWorkspaceTab(activeTab.value));
const isLibraryTab = computed(() => ['finished', 'favorite', 'watching'].includes(activeTab.value));
const loading = ref(false);
const pageTitle = computed(() => currentTab.value.label);
const detailVisible = ref(false);
const timelineModeVisible = ref(false);
const currentAnime = ref(null);
const sourceRect = ref(null);
const sourceImg = ref(null);
const currentYear = new Date().getFullYear();
const timelineEntryStyle = computed(() => ({
  backgroundImage: `linear-gradient(90deg, rgba(6, 12, 16, 0.92), rgba(6, 12, 16, 0.52) 58%, rgba(6, 12, 16, 0.22)), url(${timelineBgUrl})`
}));

/** 统计数值展示上限，避免异常接口数据撑爆页面布局 */
const MAX_STAT_VALUE = 999999;

/** 年度趋势固定展示 12 个月，不提供前端年份选择入口 */
const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);

/**
 * @function toSafeStatNumber
 * @description 将后端统计字段规整为有限非负整数，阻断 NaN、Infinity、负数和超大值污染视图。
 * @param {unknown} value - 接口返回的原始统计值
 * @returns {number} 安全可展示的统计值
 */
function toSafeStatNumber(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 0;
  return Math.min(Math.trunc(numberValue), MAX_STAT_VALUE);
}

/**
 * @function buildRecentDateLabels
 * @description 生成近七天日期标签，作为后端缺失 labels 时的安全兜底。
 * @returns {string[]} 近七天 MM-DD 标签
 */
function buildRecentDateLabels() {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  });
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return formatter.format(date).replace(/\//g, '-');
  });
}

/**
 * @function normalizeStatSeries
 * @description 规整图表序列，确保标签和值一一对应，并限制最大渲染数量。
 * @param {unknown} labels - 后端返回的标签列表
 * @param {unknown} values - 后端返回的数值列表
 * @param {string[]} fallbackLabels - 标签缺失时的兜底列表
 * @param {number} maxItems - 最大渲染数量
 * @returns {{ labels: string[], values: number[] }} 安全图表数据
 */
function normalizeStatSeries(labels, values, fallbackLabels, maxItems) {
  const sourceLabels = Array.isArray(labels) && labels.length > 0 ? labels : fallbackLabels;
  const sourceValues = Array.isArray(values) ? values : [];
  const length = Math.min(
    maxItems,
    Math.max(sourceLabels.length, sourceValues.length, fallbackLabels.length)
  );

  return {
    labels: Array.from({ length }, (_, index) =>
      String(sourceLabels[index] ?? fallbackLabels[index] ?? '')
    ),
    values: Array.from({ length }, (_, index) => toSafeStatNumber(sourceValues[index]))
  };
}

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

/** Keep-Alive数据缓存 */
const cachedData = shallowReactive({
  finished: null,
  favorite: null,
  watching: null,
  stats: null
});

const currentLibraryData = computed(() => cachedData[activeTab.value]);
const libraryGroups = computed(() =>
  activeTab.value === 'finished'
    ? currentLibraryData.value?.groupedAnimes || []
    : [{ animes: currentLibraryData.value?.animes || [] }]
);
const tabCounts = computed(() => ({
  finished:
    cachedData.finished?.groupedAnimes?.reduce(
      (sum, group) => sum + (group.animes?.length || 0),
      0
    ) ?? summaryCounts.value?.totalFinished,
  favorite: cachedData.favorite?.total ?? summaryCounts.value?.totalFavorite,
  watching: cachedData.watching?.total ?? summaryCounts.value?.totalWatching
}));

let summaryRequest = 0;

async function loadSummary() {
  const request = ++summaryRequest;
  try {
    const response = await animeApi.getStatsMain();
    if (request === summaryRequest) summaryCounts.value = response.data;
  } catch {
    /* 总数读取失败不阻塞片库。 */
  }
}

/** 管理写入后使所有分类失效，防止返回片库仍显示旧记录。 */
function invalidateLibrary() {
  dataRevision++;
  for (const key of Object.keys(cachedData)) cachedData[key] = null;
  scrollPositions.clear();
  loadSummary();
}

async function refreshActiveTab() {
  if (activeTab.value === 'admin') return adminView.value?.refresh();
  if (activeTab.value === 'settings') return loadDemoAccount();
  if (activeTab.value === 'about') return;
  cachedData[activeTab.value] = null;
  await Promise.all([loadTabData(activeTab.value), loadSummary()]);
}

/** 统计页展示摘要，统一从已清洗缓存中派生，避免模板层重复计算 */
const statsSummary = computed(() => {
  const stats = cachedData.stats || {};
  const weeklyValues = Array.isArray(stats.weeklyValues) ? stats.weeklyValues : [];
  const annualLabels = Array.isArray(stats.annualLabels) ? stats.annualLabels : MONTH_LABELS;
  const annualValues = Array.isArray(stats.annualValues) ? stats.annualValues : [];
  const currentMonthIndex = new Date().getMonth();
  const peakIndex = annualValues.reduce(
    (bestIndex, value, index) => (value > (annualValues[bestIndex] ?? 0) ? index : bestIndex),
    0
  );

  return {
    totalFinished: toSafeStatNumber(stats.totalFinished),
    totalFavorite: toSafeStatNumber(stats.totalFavorite),
    totalWatching: toSafeStatNumber(stats.totalWatching),
    weeklyTotal: weeklyValues.reduce((sum, value) => sum + toSafeStatNumber(value), 0),
    weeklyPeak: weeklyValues.reduce((peak, value) => Math.max(peak, toSafeStatNumber(value)), 0),
    annualTotal: annualValues.reduce((sum, value) => sum + toSafeStatNumber(value), 0),
    currentMonthValue: toSafeStatNumber(annualValues[currentMonthIndex]),
    peakMonth:
      annualValues.length > 0 && annualValues[peakIndex] > 0
        ? String(annualLabels[peakIndex] || MONTH_LABELS[peakIndex] || '暂无')
        : '暂无'
  };
});

/** 顶部三枚指标卡配置，PC 与移动端共用同一套展示内容 */
const statsMetricCards = computed(() => [
  {
    key: 'watching',
    label: '正在追',
    value: statsSummary.value.totalWatching,
    unit: '部',
    desc: '持续更新中',
    icon: 'fas fa-tv',
    tone: 'green'
  },
  {
    key: 'favorite',
    label: '收藏',
    value: statsSummary.value.totalFavorite,
    unit: '部',
    desc: '心动的作品',
    icon: 'fas fa-heart',
    tone: 'pink'
  },
  {
    key: 'monthly',
    label: '本月观看',
    value: statsSummary.value.currentMonthValue,
    unit: '集',
    desc: '本月已记录',
    icon: 'fas fa-calendar-check',
    tone: 'purple'
  }
]);

/**
 * 处理Tab切换
 */
function handleTabChange(item) {
  if (item.key !== activeTab.value) router.push({ path: '/', query: { view: item.key } });
}

watch(
  () => route.query.view,
  async (value, _previous, onCleanup) => {
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    scrollPositions.set(activeTab.value, mainContainer.value?.scrollTop || 0);
    disposeCharts();
    activeTab.value = getWorkspaceTab(value).key;
    loadError.value = '';
    loading.value = false;
    if (activeTab.value === 'settings') loadDemoAccount(true);
    if (['finished', 'favorite', 'watching', 'stats'].includes(activeTab.value)) {
      if (!cachedData[activeTab.value]) await loadTabData(activeTab.value);
      else if (activeTab.value === 'stats') nextTick(renderCharts);
    }
    await nextTick();
    if (cancelled) return;
    if (mainContainer.value)
      mainContainer.value.scrollTop = scrollPositions.get(activeTab.value) || 0;
  }
);

let dataRevision = 0;
const pendingTabs = new Map();

/**
 * 加载各Tab数据
 */
async function loadTabData(tabName) {
  if (!['finished', 'favorite', 'watching', 'stats'].includes(tabName)) return;
  const revision = dataRevision;
  const request = Symbol(tabName);
  pendingTabs.set(tabName, request);
  loadError.value = '';
  loading.value = true;

  try {
    if (tabName === 'stats') {
      const [mainRes, weeklyRes, annualRes] = await Promise.all([
        animeApi.getStatsMain(),
        animeApi.getStatsWeekly(),
        animeApi.getStatsAnnual()
      ]);

      if (revision !== dataRevision || pendingTabs.get(tabName) !== request) return;
      const weeklySeries = normalizeStatSeries(
        weeklyRes?.data?.labels,
        weeklyRes?.data?.values,
        buildRecentDateLabels(),
        7
      );
      const annualSeries = normalizeStatSeries(
        annualRes?.data?.labels,
        annualRes?.data?.values,
        MONTH_LABELS,
        12
      );

      cachedData.stats = {
        totalFinished: toSafeStatNumber(mainRes?.data?.totalFinished),
        totalFavorite: toSafeStatNumber(mainRes?.data?.totalFavorite),
        totalWatching: toSafeStatNumber(mainRes?.data?.totalWatching),
        weeklyLabels: weeklySeries.labels,
        weeklyValues: weeklySeries.values,
        annualLabels: annualSeries.labels,
        annualValues: annualSeries.values
      };

      nextTick(() => {
        renderCharts();
      });
    } else {
      const res = await animeApi.getMainList(tabName);
      if (revision !== dataRevision || pendingTabs.get(tabName) !== request) return;
      cachedData[tabName] = res.data;
    }
  } catch (err) {
    if (activeTab.value === tabName)
      loadError.value = '数据加载失败，请检查后端服务地址或网络连接。';
  } finally {
    if (activeTab.value === tabName && pendingTabs.get(tabName) === request) loading.value = false;
  }
}

/**
 * 渲染ECharts图表
 */
async function renderCharts() {
  if (!cachedData.stats || activeTab.value !== 'stats') return;

  const weeklyDom = weeklyChartDom.value;
  const annualDom = annualChartDom.value;

  if (weeklyDom) {
    weeklyChart = await renderChart(
      weeklyDom,
      cachedData.stats.weeklyLabels,
      cachedData.stats.weeklyValues,
      'rgba(0, 122, 255, 1)',
      'rgba(124, 183, 255, 1)',
      weeklyChart
    );
  }
  if (annualDom) {
    annualChart = await renderChart(
      annualDom,
      cachedData.stats.annualLabels,
      cachedData.stats.annualValues,
      'rgba(0, 122, 255, 1)',
      'rgba(124, 183, 255, 1)',
      annualChart
    );
  }
}

/**
 * 渲染单个柱状图（异步加载echarts）
 * @param {HTMLElement} dom - 图表挂载节点
 * @param {string[]} labels - 横轴标签
 * @param {number[]} values - 柱状图数值
 * @param {string} colorTop - 渐变顶部颜色
 * @param {string} colorBottom - 渐变底部颜色
 * @param {import('echarts').ECharts | null} existingChart - 旧图表实例
 * @returns {Promise<import('echarts').ECharts | null>} 新图表实例
 */
async function renderChart(dom, labels, values, colorTop, colorBottom, existingChart) {
  if (!dom) return existingChart || null;

  const echarts = await loadECharts();
  if (!echarts || !dom.isConnected || activeTab.value !== 'stats') return null;

  // 销毁旧实例，防止重复 init 造成内存泄露与 resize 异常。
  if (existingChart) {
    existingChart.dispose();
  }

  const chart = echarts.init(dom);

  const option = {
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: 'rgba(0, 122, 255, 0.12)',
      borderWidth: 1,
      textStyle: { color: '#1d1d1f', fontSize: 12 },
      extraCssText: 'box-shadow:0 8px 24px rgba(15,23,42,0.08);border-radius:12px;'
    },
    grid: {
      top: 26,
      left: 10,
      right: 10,
      bottom: 6,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#5e6472',
        fontSize: 12,
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: {
        lineStyle: { type: 'dashed', color: 'rgba(15, 23, 42, 0.07)' }
      },
      axisLabel: {
        color: '#5e6472',
        fontSize: 12
      }
    },
    series: [
      {
        data: values,
        type: 'bar',
        barWidth: 18,
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: [8, 8, 4, 4],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colorBottom },
            { offset: 1, color: colorTop }
          ]),
          shadowColor: 'rgba(0, 122, 255, 0.22)',
          shadowBlur: 8,
          shadowOffsetY: 4
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(0, 122, 255, 0.3)'
          }
        }
      }
    ]
  };

  chart.setOption(option);
  return chart;
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

function openTimelineMode() {
  timelineModeVisible.value = true;
}

function closeTimelineMode() {
  timelineModeVisible.value = false;
}

onMounted(() => {
  loadTabData(activeTab.value);
  loadSummary();
  if (activeTab.value === 'settings') loadDemoAccount(true);
});

function disposeCharts() {
  weeklyChart?.dispose();
  annualChart?.dispose();
  weeklyChart = null;
  annualChart = null;
}

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
  dataRevision++;
  summaryRequest++;
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
.workspace {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  position: relative;
}
.app-main {
  background: rgba(248, 250, 253, 0.92);
  scrollbar-gutter: stable;
}
.content-section {
  flex-shrink: 0;
}
.collection-banner {
  height: 136px;
  margin-bottom: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26px;
  border: 1px solid #dbe4ed;
  border-left: 3px solid #7095be;
  background:
    linear-gradient(90deg, #edf3fa 4%, #edf3faeb 40%, #edf3fa33),
    url('/img/manga-wallpaper.webp') 70% 42% / cover;
}
.banner-copy > span {
  color: #6b89ad;
  font-size: 8px;
  letter-spacing: 2px;
}
.banner-copy h2 {
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 1px;
  margin: 12px 0 9px;
  color: #465f80;
}
.banner-copy p {
  font-size: 10px;
  color: #8999af;
}
.banner-mark {
  writing-mode: vertical-rl;
  font-size: 11px;
  letter-spacing: 4px;
  color: #6d82a0;
}
.workspace-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #fff4f3;
  border: 1px solid #efc8c4;
  color: #ad4d43;
  font-size: 12px;
  margin-bottom: 20px;
}
.management-main {
  overflow: hidden;
}
.management-content {
  padding: 0 !important;
  display: flex;
  flex: 1;
  min-height: 0;
}
.stats-dashboard-header {
  display: none !important;
}
.stats-dashboard-shell {
  max-width: none !important;
}
.demo-account-box {
  max-width: 850px !important;
  border: 1px solid var(--border);
  background: #fff !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.app-container {
  display: flex;
  height: 100%;
  width: 100%;
}

.app-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;

  /* 绝对禁止横向滑动 */
  -webkit-overflow-scrolling: touch;
  width: 100%;
}

.content-section {
  padding: 0 32px 36px;
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
  overflow: hidden;

  /* 防止标题过长撑开容器 */
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

.empty-text {
  text-align: center;
  color: var(--sys-text-secondary);
  margin-top: 50px;
}

.stats-dashboard-page {
  width: 100%;
}

.stats-dashboard-shell {
  width: min(100%, 1060px);
  margin: 0 auto;
  position: relative;
}

.stats-dashboard-header {
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 26px 0 30px;
}

.stats-title-group {
  text-align: left;
}

.stats-title-group h2 {
  margin: 0;
  color: #111827;
  font-size: 34px;
  font-weight: 850;
  line-height: 1.15;
}

.stats-title-group p {
  margin: 7px 0 0;
  color: #7a8290;
  font-size: 15px;
  font-weight: 600;
}

.stats-dashboard-scroll {
  padding: 0 0 72px;
  overflow: visible;
}

.stats-overview-grid {
  display: grid;
  grid-template-columns: minmax(320px, 1.06fr) minmax(420px, 1.32fr);
  gap: 18px;
  margin-bottom: 22px;
}

.stats-total-card {
  position: relative;
  min-height: 226px;
  overflow: hidden;
  border-radius: 24px;
  padding: 30px 32px;
  color: #ffffff;
  background-image:
    linear-gradient(135deg, rgba(0, 122, 255, 0.96), rgba(41, 151, 255, 0.86)),
    url('/img/downloaded-image.jpg');
  background-size: cover;
  background-position: center;
  box-shadow: 0 16px 30px rgba(0, 122, 255, 0.2);
}

.stats-total-card::before {
  content: '';
  position: absolute;
  right: -34px;
  bottom: -44px;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
}

.stats-total-card::after {
  content: 'limange';
  position: absolute;
  right: 20px;
  bottom: 18px;
  color: rgba(255, 255, 255, 0.16);
  font-size: 42px;
  font-style: italic;
  font-weight: 800;
  pointer-events: none;
}

.stats-card-label {
  position: relative;
  z-index: 1;
  display: block;
  color: rgba(255, 255, 255, 0.92);
  font-size: 24px;
  font-weight: 800;
}

.stats-total-value {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin: 18px 0 20px;
}

.stats-total-value strong {
  color: #ffffff;
  font-size: 74px;
  font-weight: 900;
  line-height: 0.9;
}

.stats-total-value span {
  padding-bottom: 7px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 21px;
  font-weight: 800;
}

.stats-total-note {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 700;
}

.stats-total-note i {
  font-size: 11px;
}

.stats-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.stats-mini-card {
  min-width: 0;
  min-height: 226px;
  padding: 28px 18px 22px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.stats-icon-badge {
  width: 52px;
  height: 52px;
  margin-bottom: 18px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 24px;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.stats-icon-badge.green {
  background: linear-gradient(135deg, #49d7b0, #19b79e);
}

.stats-icon-badge.pink {
  background: linear-gradient(135deg, #ff6ca2, #ff3d7f);
}

.stats-icon-badge.purple {
  background: linear-gradient(135deg, #9a7cff, #7656e8);
}

.stats-mini-label {
  color: #111827;
  font-size: 16px;
  font-weight: 800;
}

.stats-mini-card strong {
  margin-top: 10px;
  color: #111827;
  font-size: 35px;
  font-weight: 900;
  line-height: 1;
}

.stats-mini-card small {
  color: #2563eb;
  font-size: 15px;
  font-weight: 800;
}

.stats-mini-card p {
  margin-top: 14px;
  color: #7a8290;
  font-size: 13px;
  font-weight: 600;
}

.stats-chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.2fr);
  gap: 22px;
  margin-bottom: 24px;
}

.stats-chart-card,
.stats-report-card {
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
}

.stats-chart-card {
  min-width: 0;
  padding: 26px 24px 18px;
}

.stats-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.stats-card-heading h3,
.stats-report-card h3 {
  margin: 0;
  color: #111827;
  font-size: 21px;
  font-weight: 850;
  line-height: 1.3;
}

.stats-card-heading i,
.stats-report-card h3 i {
  color: var(--sys-blue);
  margin-right: 10px;
}

.stats-chart-pill {
  flex-shrink: 0;
  min-height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  background: #f0f7ff;
  color: #0b73e8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
}

.stats-chart-desc {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
}

.stats-chart-desc strong {
  color: var(--sys-blue);
}

.stats-chart-area {
  width: 100%;
  height: 236px;
}

.stats-report-card {
  position: relative;
  overflow: hidden;
  min-height: 214px;
  padding: 30px 32px;
}

.stats-report-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 78% 18%, rgba(0, 122, 255, 0.1), transparent 24%),
    radial-gradient(circle at 92% 80%, rgba(139, 92, 246, 0.08), transparent 26%);
  pointer-events: none;
}

.stats-report-content {
  position: relative;
  z-index: 1;
  max-width: 760px;
}

.stats-report-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  margin-top: 30px;
}

.stats-report-item {
  min-width: 0;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  column-gap: 14px;
  align-items: center;
}

.report-icon {
  grid-row: span 2;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
}

.report-icon.blue {
  background: linear-gradient(135deg, #1e9bff, #007aff);
}

.report-icon.purple {
  background: linear-gradient(135deg, #9d6cff, #7656e8);
}

.report-icon.cyan {
  background: linear-gradient(135deg, #22c7ff, #0b8ff0);
}

.stats-report-item p {
  margin: 0;
  color: #5e6472;
  font-size: 14px;
  font-weight: 700;
}

.stats-report-item strong {
  color: #111827;
  font-size: 29px;
  font-weight: 900;
  line-height: 1.15;
}

.stats-report-item small {
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.stats-report-art {
  position: absolute;
  right: -18px;
  bottom: -28px;
  width: 260px;
  height: 190px;
  opacity: 0.18;
  background-image: url('/img/downloaded-image.jpg');
  background-size: cover;
  background-position: center;
  border-radius: 999px 0 0 0;
  filter: saturate(1.08);
  pointer-events: none;
}

.stats-timeline-entry {
  position: relative;
  width: 100%;
  min-height: 156px;
  margin-top: 24px;
  padding: 28px 30px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 24px;
  background-size: cover;
  background-position: center;
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.14);
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  text-align: left;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.stats-timeline-entry::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 82% 22%, rgba(215, 251, 255, 0.24), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 44%);
  pointer-events: none;
}

.stats-timeline-entry:hover,
.stats-timeline-entry:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(215, 251, 255, 0.42);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.18);
  outline: none;
}

.timeline-entry-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.timeline-entry-kicker {
  color: rgba(215, 251, 255, 0.78);
  font-size: 13px;
  font-weight: 800;
}

.timeline-entry-copy strong {
  color: #ffffff;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.1;
}

.timeline-entry-copy small {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  font-weight: 700;
}

.timeline-entry-action {
  position: relative;
  z-index: 1;
  width: 50px;
  height: 50px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(12px);
}

/* 演示账户与相邻设置卡片共用宽度、间距和表单密度。 */
.demo-account-box {
  max-width: 850px;
  margin-top: 18px;
  padding: 23px;
  border: 1px solid var(--border);
  background: var(--surface);
}
.demo-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 22px;
}
.demo-heading > i {
  padding-top: 1px;
  color: #4584bf;
  font-size: 16px;
}
.demo-heading h3 {
  font-size: 13px;
  font-weight: 600;
  color: #3a4657;
}
.demo-heading p {
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.6;
  color: #8a94a4;
}
.demo-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px;
  border: 1px solid var(--border);
  background: var(--panel);
}
.settings-label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 500;
}
.settings-desc {
  margin-top: 5px;
  color: var(--sys-text-secondary);
  font-size: 11px;
  line-height: 1.6;
}
.demo-status-pill {
  flex-shrink: 0;
  padding: 3px 8px;
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--sys-text-secondary);
}
.demo-status-pill.enabled {
  color: #107c10;
  border-color: #107c1033;
  background: #107c100a;
}
.demo-account-notice,
.demo-loading {
  color: var(--sys-text-secondary);
  font-size: 12px;
  line-height: 1.8;
}
.demo-loading {
  padding-top: 16px;
}
.demo-form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  margin-top: 20px;
}
.demo-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}
.demo-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  color: var(--ink);
  font-size: 12px;
  font-weight: 500;
}
.demo-field input {
  width: 100%;
  height: 36px;
  padding: 0 11px;
  border: 1px solid #d8e0e9;
  border-radius: 0;
  background: #fafbfc;
  color: var(--ink);
  font-size: 12px;
}
.demo-field input:focus {
  border-color: var(--sys-blue);
  outline-offset: 1px;
  background: var(--surface);
}
.demo-danger-btn {
  margin-top: 18px;
}
@media (max-width: 800px) {
  .demo-form-row {
    grid-template-columns: 1fr;
  }
}
</style>
