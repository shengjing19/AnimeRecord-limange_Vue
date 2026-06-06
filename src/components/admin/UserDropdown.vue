<template>
  <!--
    UserDropdown.vue - 用户下拉菜单组件
    右上角用户头像与下拉菜单
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <div class="user-profile-widget">
    <div class="avatar-trigger" @click="toggleDropdown">
      <img src="/img/UsersIcon.png" alt="User" />
      <span class="online-status"></span>
    </div>
    <Transition name="dropdown-fade">
      <div v-if="isOpen" class="user-dropdown">
        <div class="dropdown-header-info">
          <img src="/img/UsersIcon.png" class="dropdown-avatar" alt="User" />
          <div class="user-text-info">
            <span class="u-name">{{ username }}</span>
            <span class="u-email">欢迎使用limange</span>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item" @click="goHome">
          <i class="fa-solid fa-house"></i> 返回首页
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const username = authStore.username;
const isOpen = ref(false);

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function goHome() {
  router.push('/');
}

/** 点击外部关闭下拉菜单 */
function handleClickOutside(event) {
  const widget = event.target.closest('.user-profile-widget');
  if (!widget) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.user-profile-widget {
  position: absolute;
  top: 20px;
  right: 30px;
  z-index: 1000;
}

.avatar-trigger {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar-trigger:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.avatar-trigger img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.online-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background-color: #10b981;
  border: 2px solid #fff;
  border-radius: 50%;
}

.user-dropdown {
  position: absolute;
  top: 55px;
  right: 0;
  width: 260px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  transform-origin: top right;
}

.dropdown-fade-enter-active {
  animation: dropdownFadeIn 0.2s ease;
}
.dropdown-fade-leave-active {
  animation: dropdownFadeIn 0.15s ease reverse;
}

@keyframes dropdownFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.dropdown-header-info {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dropdown-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.user-text-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.u-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.u-email {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-divider {
  height: 1px;
  background-color: #f1f5f9;
  margin: 8px 0;
}

.dropdown-item {
  padding: 10px 20px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.1s;
}

.dropdown-item:hover {
  background-color: #f8fafc;
  color: #2563eb;
}

.dropdown-item i {
  width: 18px;
  text-align: center;
  font-size: 16px;
}
</style>
