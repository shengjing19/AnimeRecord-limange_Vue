<template>
  <section class="about-app" aria-label="关于 limange">
    <div class="about-brand">
      <img src="/img/app-icon.png" alt="" />
      <div>
        <div class="about-name">
          <h2>{{ APP_CONFIG.appName }}</h2>
          <span>{{ APP_CONFIG.version }}</span>
        </div>
        <p>你的动漫档案，和每一段值得收藏的故事。</p>
      </div>
    </div>

    <div class="about-panels">
      <section class="about-panel">
        <header>
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <h3>应用信息</h3>
        </header>
        <dl>
          <div>
            <dt>产品</dt>
            <dd>{{ APP_CONFIG.appName }} · 动漫记录</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd class="tabular">{{ APP_CONFIG.version }}</dd>
          </div>
          <div>
            <dt>发布日期</dt>
            <dd class="tabular">{{ APP_CONFIG.releaseDate }}</dd>
          </div>
          <div>
            <dt>运行方式</dt>
            <dd>{{ isDesktop ? '桌面客户端' : 'Web 浏览器' }}</dd>
          </div>
          <div>
            <dt>技术栈</dt>
            <dd>{{ APP_CONFIG.techStack }}</dd>
          </div>
          <div>
            <dt>开源许可</dt>
            <dd>GPL-3.0-only</dd>
          </div>
        </dl>
        <p class="panel-note">
          连接你的 Newlimange 服务，管理已看完、最喜欢和正在追的作品，浏览观看统计与时间线。
        </p>
      </section>

      <section class="about-panel">
        <header>
          <i class="fa-solid fa-code" aria-hidden="true"></i>
          <h3>开发者与项目</h3>
        </header>
        <div class="developer-content">
          <span class="about-caption">DEVELOPER</span>
          <strong>{{ APP_CONFIG.author }}</strong>
          <p>在 GitHub 主页查看项目源码、版本动态与相关作品。</p>
          <a
            class="workbench-button"
            :href="APP_CONFIG.github"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="fa-brands fa-github" aria-hidden="true"></i>
            GitHub 主页
            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        </div>
        <p class="panel-note">记录进度，整理收藏。让喜欢的故事有处可寻。</p>
      </section>
    </div>
  </section>
</template>

<script setup>
import { APP_CONFIG } from '@/utils/constants';

const isDesktop = Boolean(window.limangeDesktop);
</script>

<style scoped>
.about-app {
  max-width: 1000px;
}
.about-brand {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 26px;
  margin-bottom: 18px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--sys-blue);
  background: var(--surface);
}
.about-brand img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
.about-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.about-name h2 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
}
.about-name > span {
  border: 1px solid var(--border);
  padding: 3px 7px;
  color: var(--sys-text-secondary);
  font-size: 11px;
}
.about-brand p,
.developer-content p,
.panel-note {
  color: var(--sys-text-secondary);
  font-size: 12px;
  line-height: 1.8;
}
.about-brand p {
  margin-top: 7px;
}
.about-panels {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  align-items: start;
  gap: 18px;
}
.about-panel {
  min-width: 0;
  border: 1px solid var(--border);
  background: var(--surface);
}
.about-panel header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}
.about-panel header i {
  color: var(--sys-text-secondary);
  font-size: 13px;
}
.about-panel h3 {
  font-size: 13px;
  font-weight: 600;
}
dl {
  padding: 0 18px;
}
dl > div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  padding: 13px 0;
  font-size: 12px;
  line-height: 1.6;
}
dl > div + div {
  border-top: 1px solid var(--border);
}
dt {
  color: var(--sys-text-secondary);
}
dd {
  overflow-wrap: anywhere;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.panel-note {
  border-top: 1px solid var(--border);
  padding: 16px 18px;
  font-size: 11px;
}
.developer-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 22px 18px;
}
.about-caption {
  font-size: 9px;
  letter-spacing: 1.5px;
  color: var(--muted);
}
.developer-content strong {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
@media (max-width: 1100px) {
  .about-panels {
    grid-template-columns: 1fr;
  }
}
</style>
