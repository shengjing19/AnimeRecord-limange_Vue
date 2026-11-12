<template>
  <section class="appearance-settings">
    <div class="settings-card">
      <div class="settings-heading">
        <i class="fa-solid fa-palette" aria-hidden="true"></i>
        <div>
          <h3>外观与背景</h3>
          <p>漫画的氛围，清爽的工作空间。</p>
        </div>
      </div>
      <div class="background-choices">
        <button
          v-for="option in backgrounds"
          :key="option.value"
          :class="['appearance-choice', { selected: appStore.bgTheme === option.value }]"
          :aria-pressed="appStore.bgTheme === option.value"
          @click="appStore.setBgTheme(option.value)"
        >
          <span :class="['background-preview', option.value]"></span
          ><span
            >{{ option.label
            }}<i v-if="appStore.bgTheme === option.value" class="fa-solid fa-circle-check"></i
          ></span>
        </button>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-heading">
        <i class="fa-solid fa-door-open" aria-hidden="true"></i>
        <div>
          <h3>登录界面</h3>
          <p>下次进入登录页时应用，账户和数据不受影响。</p>
        </div>
      </div>
      <div class="login-choices">
        <button
          :class="['appearance-choice', { selected: appStore.loginStyle === 'native' }]"
          :aria-pressed="appStore.loginStyle === 'native'"
          @click="appStore.setLoginStyle('native')"
        >
          <span class="login-preview native"><b>limange</b><i></i><i></i></span
          ><span
            >原生登录<i
              v-if="appStore.loginStyle === 'native'"
              class="fa-solid fa-circle-check"
            ></i></span
          ><small>熟悉的封面墙与居中表单</small>
        </button>
        <button
          :class="['appearance-choice', { selected: appStore.loginStyle === 'console' }]"
          :aria-pressed="appStore.loginStyle === 'console'"
          @click="appStore.setLoginStyle('console')"
        >
          <span class="login-preview console"
            ><b>WELCOME<br />BACK.</b><span><i></i><i></i><i></i></span></span
          ><span
            >控制台登录 · PVE 风格<i
              v-if="appStore.loginStyle === 'console'"
              class="fa-solid fa-circle-check"
            ></i></span
          ><small>漫画插画与独立登录面板</small>
        </button>
      </div>
    </div>
    <div class="settings-card performance-choice">
      <div>
        <h3>减少动态效果</h3>
        <p>暂停原生登录页背景滚动，减少界面过渡。适合低功耗设备。</p>
      </div>
      <label class="switch-control"
        ><input
          type="checkbox"
          :checked="appStore.reduceMotion"
          @change="appStore.setReduceMotion($event.target.checked)"
          aria-label="减少动态效果" /><span></span
      ></label>
    </div>
    <ServerSettings />
  </section>
</template>

<script setup>
import { useAppStore } from '@/stores/app';
import ServerSettings from '@/components/settings/ServerSettings.vue';

const appStore = useAppStore();
const backgrounds = [
  { value: 'manga', label: '漫画纸感' },
  { value: 'image', label: '彩色壁纸' },
  { value: 'solid', label: '纯净白色' }
];
</script>

<style scoped>
.appearance-settings {
  max-width: 850px;
}
.settings-card {
  padding: 23px;
  background: #fffffff5;
  border: 1px solid var(--border);
  margin-bottom: 18px;
}
.settings-heading {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 22px;
}
.settings-heading > i {
  color: #4584bf;
  font-size: 16px;
  padding-top: 1px;
}
h3 {
  font-size: 13px;
  color: #3a4657;
  font-weight: 600;
}
p {
  font-size: 11px;
  color: #8a94a4;
  margin-top: 7px;
  line-height: 1.6;
}
.background-choices {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.login-choices {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}
.appearance-choice {
  border: 1px solid #e1e6ed;
  background: #fff;
  padding: 8px;
  text-align: left;
}
.appearance-choice.selected {
  border-color: #3a90e0;
  box-shadow: 0 0 0 1px #3a90e0;
}
.appearance-choice > span:not(:first-child) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin: 12px 3px 5px;
}
.appearance-choice > span > i.fa-circle-check {
  color: #3189d9;
}
.appearance-choice small {
  display: block;
  font-size: 9px;
  color: #939eac;
  margin: 6px 3px 3px;
}
.background-preview {
  display: block;
  height: 76px;
  border: 1px solid #edf0f4;
}
.background-preview.manga {
  background: url('/img/manga-wallpaper.webp') center / cover;
}
.background-preview.image {
  background: url('/img/wallpaper.webp') center / cover;
}
.background-preview.solid {
  background: #fafbfc;
}
.login-preview {
  display: flex;
  height: 125px;
}
.login-preview.native {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: white;
  background:
    linear-gradient(#15223699, #15223699),
    url('/img/login/3.webp') center / cover;
}
.login-preview.native b {
  font-size: 21px;
  margin-bottom: 12px;
}
.login-preview.native i {
  width: 64px;
  height: 8px;
  background: #ffffff40;
  border-radius: 5px;
}
.login-preview.console {
  background: #f8fafc;
}
.login-preview.console b {
  display: flex;
  width: 57%;
  align-items: center;
  padding-left: 20px;
  font-size: 15px;
  color: #3a587d;
  background:
    linear-gradient(#ffffff66, #ffffff88),
    url('/img/manga-wallpaper.webp') center / cover;
}
.login-preview.console > span {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.login-preview.console i {
  width: 70%;
  height: 9px;
  border: 1px solid #d4dde9;
}
.login-preview.console i:last-child {
  background: #4085c9;
  border: none;
}
.performance-choice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
}
.switch-control input {
  position: absolute;
  opacity: 0;
}
.switch-control span {
  display: block;
  width: 33px;
  height: 18px;
  background: #c6cfda;
  border-radius: 18px;
  position: relative;
  cursor: pointer;
}
.switch-control span::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: white;
}
.switch-control input:checked + span {
  background: #3f8dd4;
}
.switch-control input:checked + span::after {
  left: 18px;
}
.switch-control input:focus-visible + span {
  outline: 2px solid #2785db;
  outline-offset: 3px;
}
</style>
