<template>
  <section class="performance-settings" aria-label="性能诊断">
    <div class="performance-heading">
      <div>
        <h3>性能诊断</h3>
        <p>滚动时采样帧间隔，记录主线程长任务、封面队列和缩略图缓存。日志仅保存在本机。</p>
      </div>
      <label
        ><input type="checkbox" :checked="report.enabled" @change="toggle($event.target.checked)" />
        启用诊断</label
      >
    </div>
    <dl>
      <div>
        <dt>最近滚动 P95</dt>
        <dd>{{ latest ? latest.p95Ms + ' ms' : '等待滚动' }}</dd>
      </div>
      <div>
        <dt>最近滚动超过 50ms</dt>
        <dd>{{ latest ? latest.over50Ms + ' 帧' : '—' }}</dd>
      </div>
      <div>
        <dt>主线程长任务</dt>
        <dd>{{ report.counters.longTasks || 0 }} 次</dd>
      </div>
      <div>
        <dt>缩略图缓存命中</dt>
        <dd>{{ report.counters.thumbnailCacheHits || 0 }} 次</dd>
      </div>
    </dl>
    <p v-if="gpuStatus">GPU 合成：{{ gpuStatus }}</p>
    <p>
      先返回片库上下滚动，再来导出日志。P95 是 95% 采样帧不超过的间隔；持续高于 33ms 或频繁超过 50ms
      值得排查。
    </p>
    <p>导出内容不含账户、令牌、作品标题、服务器地址或图片网址。</p>
    <div class="performance-actions">
      <button class="subtle-button" @click="refresh">刷新读数</button>
      <button class="subtle-button" @click="exportPerformanceLog()">导出性能日志</button>
      <button class="subtle-button" :disabled="!hasPrevious" @click="exportPerformanceLog(true)">
        导出上次运行日志
      </button>
      <button class="subtle-button" @click="clear">清空日志</button>
    </div>
  </section>
</template>

<script setup>
import { computed, shallowRef } from 'vue';
import {
  getPerformanceReport,
  getPreviousPerformanceReport,
  exportPerformanceLog,
  setPerformanceEnabled,
  clearPerformanceLog
} from '@/utils/performanceLog';

const report = shallowRef(getPerformanceReport());
const hasPrevious = shallowRef(Boolean(getPreviousPerformanceReport()));
const latest = computed(() => report.value.scrollWindows.at(-1));
const gpuStatus = computed(() => report.value.environment.runtime?.gpu?.gpu_compositing);

function refresh() {
  report.value = getPerformanceReport();
}
function toggle(value) {
  setPerformanceEnabled(value);
  refresh();
}
function clear() {
  clearPerformanceLog();
  hasPrevious.value = false;
  refresh();
}
</script>

<style scoped>
.performance-settings {
  padding: 23px;
  background: #fffffff5;
  border: 1px solid var(--border);
  margin-bottom: 18px;
}
.performance-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 9px;
}
p {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.8;
}
label {
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  font-size: 12px;
}
dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}
dt {
  font-size: 10px;
  color: var(--muted);
  margin-bottom: 8px;
}
dd {
  font-size: 18px;
  color: var(--ink);
}
.performance-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 18px;
}
</style>
