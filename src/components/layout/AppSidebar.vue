<template>
  <aside class="app-sidebar" aria-label="应用导航">
    <div class="sidebar-brand">
      <img src="/img/app-icon.png" alt="" />
      <div><strong>limange</strong><span>我的动漫档案</span></div>
    </div>
    <nav class="sidebar-nav">
      <p class="nav-section-title">我的收藏</p>
      <button
        v-for="item in libraryTabs"
        :key="item.key"
        :class="['sidebar-item', { active: activeTab === item.key }]"
        :aria-current="activeTab === item.key ? 'page' : undefined"
        @click="emit('tab-change', item)"
      >
        <i :class="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span
        ><small v-if="counts[item.key] != null">{{ counts[item.key] }}</small>
      </button>
      <p class="nav-section-title">工作空间</p>
      <button
        v-for="item in workspaceTabs"
        :key="item.key"
        :class="['sidebar-item', { active: activeTab === item.key }]"
        :aria-current="activeTab === item.key ? 'page' : undefined"
        @click="emit('tab-change', item)"
      >
        <i :class="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span>
      </button>
      <div class="sidebar-note">
        <span class="note-kicker">A LITTLE COLLECTION</span>
        <p>把喜欢的故事，<br />好好收藏。</p>
        <span>YOUR ANIME, YOUR MEMORIES.</span>
      </div>
    </nav>
    <div class="sidebar-bottom">
      <button
        v-for="item in utilityTabs"
        :key="item.key"
        :class="['sidebar-item', { active: activeTab === item.key }]"
        @click="emit('tab-change', item)"
      >
        <i :class="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span>
      </button>
      <div class="sidebar-user">
        <div class="user-avatar"><i class="fa-regular fa-user" aria-hidden="true"></i></div>
        <div class="user-meta">
          <strong>{{ authStore.username }}</strong
          ><span
            ><b class="status-dot"></b
            >{{ authStore.isDemo ? '演示账户 · 只读' : '标准账户 / 管理员' }}</span
          >
        </div>
        <button class="icon-button" aria-label="退出登录" title="退出登录" @click="handleLogout">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import { useNotify } from '@/composables/useNotify';
import { WORKSPACE_TABS } from '@/utils/workspace';

defineProps({
  activeTab: { type: String, default: 'finished' },
  counts: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['tab-change']);
const authStore = useAuthStore();
const { confirm } = useNotify();
const libraryTabs = WORKSPACE_TABS.slice(0, 3);
const workspaceTabs = WORKSPACE_TABS.slice(3, 5);
const utilityTabs = WORKSPACE_TABS.slice(5);

async function handleLogout() {
  if (await confirm({ content: '确定要退出登录吗？' })) authStore.logout();
}
</script>

<style scoped>
.app-sidebar {
  width: 216px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  border-right: 1px solid var(--border);
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 27px 22px 23px;
}
.sidebar-brand img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}
.sidebar-brand strong {
  display: block;
  font-size: 21px;
  letter-spacing: -0.6px;
}
.sidebar-brand span {
  display: block;
  font-size: 10px;
  margin-top: 3px;
  color: var(--muted);
  letter-spacing: 2px;
}
.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 10px;
}
.nav-section-title {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 1.8px;
  padding: 16px 12px 9px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 11px;
  padding: 0 13px;
  min-height: 40px;
  background: none;
  border: 0;
  border-left: 2px solid transparent;
  color: #637083;
  text-align: left;
  font-size: 12px;
  transition:
    background-color 0.15s,
    color 0.15s;
}
.sidebar-item i {
  width: 16px;
  text-align: center;
  font-size: 13px;
}
.sidebar-item span {
  flex: 1;
}
.sidebar-item small {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.sidebar-item:hover {
  background: #eef1f5;
  color: #273348;
}
.sidebar-item.active {
  color: #1672cf;
  border-left-color: #2588ed;
  background: #eaf2fb;
  font-weight: 600;
}
.sidebar-note {
  margin: 32px 12px 18px;
  padding: 18px 0;
  border-top: 1px solid var(--border);
}
.sidebar-note .note-kicker {
  font-size: 8px;
  letter-spacing: 1.4px;
  color: #3186d7;
}
.sidebar-note p {
  font-size: 17px;
  line-height: 1.8;
  margin: 12px 0;
  color: #768398;
  font-weight: 300;
}
.sidebar-note > span:last-child {
  font-size: 7px;
  letter-spacing: 0.8px;
  color: #99a1ae;
}
.sidebar-bottom {
  border-top: 1px solid var(--border);
  padding-top: 6px;
}
.sidebar-bottom > .sidebar-item {
  padding-left: 23px;
}
.sidebar-user {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 14px 13px;
  border-top: 1px solid var(--border);
}
.user-avatar {
  width: 28px;
  height: 30px;
  display: grid;
  place-items: center;
  color: #7d8ba0;
  background: #edf0f4;
}
.user-meta {
  flex: 1;
  min-width: 0;
}
.user-meta strong {
  display: block;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  margin-top: 5px;
  color: var(--muted);
}
.status-dot {
  width: 5px;
  height: 5px;
  background: #38a182;
  border-radius: 50%;
}
@media (max-width: 1050px) {
  .app-sidebar {
    width: 180px;
  }
  .sidebar-brand {
    padding-left: 17px;
  }
  .sidebar-note {
    margin-top: 20px;
  }
}
</style>
