<template>
  <!--
    AppSidebar.vue - 侧边栏导航组件
    侧边栏，包含用户信息与导航菜单
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <aside class="app-sidebar">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="logo">
        <h2 class="app-title">limange</h2>
      </div>

      <div class="user-menu-container">
        <div class="user-profile">
          <div class="avatar-glass"><i class="fas fa-user"></i></div>
          <div class="user-meta">
            <h4>{{ username }}</h4>
            <p>欢迎使用limange</p>
            <!-- 账户身份铭牌：桌面端在侧边栏头部展示当前登录账户类型。 -->
            <span :class="['account-role-badge', { 'is-demo': isDemoAccount }]">
              {{ accountRoleText }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <!-- 观看分类 -->
      <h5 class="nav-section-title">观看分类</h5>
      <ul>
        <li
          v-for="item in watchTabs"
          :key="item.key"
          :class="{ active: activeTab === item.key }"
          @click="switchTab(item)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </li>
      </ul>

      <!-- 数据管理 -->
      <h5 class="nav-section-title">数据管理</h5>
      <ul>
        <li @click="router.push('/admin')">
          <i class="fas fa-database"></i>
          <span>数据管理</span>
        </li>
      </ul>

      <!-- 应用设置 -->
      <h5 class="nav-section-title">应用设置</h5>
      <ul>
        <li
          :class="{ active: activeTab === 'settings' }"
          @click="switchTab({ key: 'settings', label: '设置', icon: 'fas fa-cog' })"
        >
          <i class="fas fa-cog"></i>
          <span>设置</span>
        </li>
        <li
          :class="{ active: activeTab === 'about' }"
          @click="switchTab({ key: 'about', label: '关于应用', icon: 'fas fa-info-circle' })"
        >
          <i class="fas fa-info-circle"></i>
          <span>关于应用</span>
        </li>
        <div class="sidebar-divider"></div>
        <li class="destructive" @click="handleLogout">
          <i class="fas fa-sign-out-alt"></i>
          <span>退出登录</span>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { animate, cubicBezier } from 'animejs';
import { useAuthStore } from '@/stores/auth';
import { useNotify } from '@/composables/useNotify';

const props = defineProps({
  /** 当前激活的Tab */
  activeTab: { type: String, default: 'finished' }
});

const emit = defineEmits(['tab-change']);

const router = useRouter();
const authStore = useAuthStore();
const { confirm } = useNotify();

const username = computed(() => authStore.username);
const isDemoAccount = computed(() => authStore.isDemo);
const accountRoleText = computed(() => (isDemoAccount.value ? '演示账户' : '标准账户/管理员'));

/** 观看分类Tab配置 */
const watchTabs = [
  { key: 'finished', label: '已看完', icon: 'fas fa-check-circle' },
  { key: 'favorite', label: '最喜欢', icon: 'fas fa-heart' },
  { key: 'watching', label: '正在追', icon: 'fas fa-running' },
  { key: 'stats', label: '数据统计', icon: 'fas fa-chart-bar' }
];

/**
 * 切换Tab
 * @param {Object} item - Tab配置对象
 */
function switchTab(item) {
  emit('tab-change', item);
}

/** 退出登录（带渐隐收缩动画） */
async function handleLogout() {
  const isConfirm = await confirm({ content: '确定要退出登录吗？' });
  if (!isConfirm) return;

  /**
   * 创建全屏遮罩，覆盖整个应用
   * 动画：遮罩淡入 + 应用内容渐隐缩小
   */
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
    }
  });
}
</script>

<style scoped>
.app-sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.45);
  border-right: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 1px 0 20px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  z-index: 100;
  flex-shrink: 0;
}

/* 适配移动端：小屏幕下自动隐藏侧边栏，将导航交接给底部的 AppBottomBar */
@media (max-width: 768px) {
  .app-sidebar {
    display: none;
  }
}

.sidebar-header {
  padding: 40px 20px 20px;
}

.app-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--sys-blue);
  letter-spacing: 1px;
  margin-bottom: 25px;
}

.user-menu-container {
  width: 100%;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  border: 1px solid var(--liquid-border);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05), inset 0 1px 1px #fff;
  transition: 0.3s;
}

.user-profile:hover {
  transform: translateY(-2px);
  background: #fff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.avatar-glass {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0eafc, #cfdef3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sys-blue);
  font-size: 20px;
  border: 2px solid #fff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.user-meta h4 {
  font-size: 15px;
  font-weight: 600;
  color: var(--sys-text-primary);
}

.user-meta p {
  font-size: 12px;
  color: var(--sys-text-secondary);
}

.account-role-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 7px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  color: #0f7a3a;
  background: rgba(52, 199, 89, 0.14);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}

.account-role-badge.is-demo {
  color: #9a5a00;
  background: rgba(255, 149, 0, 0.16);
}

.nav-section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--sys-text-secondary);
  margin: 25px 0 10px 20px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0 15px;
}

.sidebar-nav li {
  padding: 12px 16px;
  margin-bottom: 6px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--sys-text-primary);
}

.sidebar-nav li i {
  width: 20px;
  text-align: center;
  font-size: 18px;
  color: var(--sys-text-secondary);
  transition: 0.3s;
}

.sidebar-nav li:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: translateX(5px);
}

.sidebar-nav li:hover i {
  color: var(--sys-blue);
}

.sidebar-nav li.active {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05), inset 0 0 0 1px #fff;
  color: var(--sys-blue);
}

.sidebar-nav li.active i {
  color: var(--sys-blue);
}

.sidebar-nav li.destructive {
  color: #ff3b30;
}

.sidebar-nav li.destructive i {
  color: #ff3b30;
}

.sidebar-nav li.destructive:hover {
  background: rgba(255, 59, 48, 0.1);
}

.sidebar-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.05);
  margin: 10px 0;
}
</style>
