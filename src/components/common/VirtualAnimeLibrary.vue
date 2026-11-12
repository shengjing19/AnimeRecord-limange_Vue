<template>
  <div
    ref="container"
    class="virtual-library"
    :style="{ height: layout.height + 'px' }"
    aria-label="动漫片库"
  >
    <div
      v-for="row in visibleRows"
      :key="row.key"
      :class="['library-row', row.kind]"
      :style="{
        transform: 'translateY(' + row.top + 'px)',
        height: row.height + 'px',
        gridTemplateColumns: 'repeat(' + layout.columns + ', minmax(0, 1fr))'
      }"
    >
      <div v-if="row.kind === 'heading'" class="library-heading">
        <span class="group-marker"></span><strong>{{ row.group.year || '全部作品' }}</strong
        ><span v-if="row.group.month" class="group-month"
          >{{ String(row.group.month).replace(/月$/, '') }} 月</span
        ><span class="group-rule"></span
        ><span class="group-count">{{ row.group.animes.length }} 部</span>
      </div>
      <template v-else
        ><AnimeCard
          v-for="anime in row.animes"
          :key="anime.id"
          :anime="anime"
          @click="$emit('select', $event)"
      /></template>
    </div>
  </div>
  <div v-if="!layout.rows.length" class="library-empty">
    <i class="fa-regular fa-folder-open" aria-hidden="true"></i>
    <h3>这里的故事，等你来记录</h3>
    <p>在「数据管理」中添加第一部动漫吧。</p>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import AnimeCard from '@/components/common/AnimeCard.vue';
import { buildLibraryRows, findVisibleRows } from '@/utils/virtualLibrary';

const props = defineProps({ groups: { type: Array, default: () => [] } });
defineEmits(['select']);
const container = ref(null);
const width = ref(1000);
const scrollTop = ref(0);
const viewportHeight = ref(800);
const layout = computed(() => buildLibraryRows(props.groups, width.value));
const visibleRows = computed(() => {
  const overscan = layout.value.rowHeight * 2;
  return findVisibleRows(
    layout.value.rows,
    scrollTop.value - overscan,
    scrollTop.value + viewportHeight.value + overscan
  );
});

let scrollRoot;
let resizeObserver;
let frame = 0;
let offset = 0;

function syncViewport() {
  frame = 0;
  scrollTop.value = Math.max(0, scrollRoot.scrollTop - offset);
}

function onScroll() {
  if (!frame) frame = requestAnimationFrame(syncViewport);
}

onMounted(() => {
  scrollRoot = container.value.closest('.app-main');
  if (!scrollRoot) return;

  resizeObserver = new ResizeObserver(() => {
    width.value = container.value.clientWidth;
    viewportHeight.value = scrollRoot.clientHeight;
    offset =
      container.value.getBoundingClientRect().top -
      scrollRoot.getBoundingClientRect().top +
      scrollRoot.scrollTop;
    syncViewport();
  });
  resizeObserver.observe(container.value);
  resizeObserver.observe(scrollRoot);
  scrollRoot.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  scrollRoot?.removeEventListener('scroll', onScroll);
});
</script>

<style scoped>
.virtual-library {
  position: relative;
  width: 100%;
  overflow-anchor: none;
}
.library-row {
  position: absolute;
  inset: 0 0 auto;
  width: 100%;
}
.library-row.cards {
  display: grid;
  gap: 18px;
  align-content: start;
}
.library-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 40px;
}
.group-marker {
  width: 3px;
  height: 13px;
  background: #428bd2;
}
.library-heading strong {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.group-month {
  color: #6d7c90;
  font-size: 11px;
}
.group-rule {
  flex: 1;
  height: 1px;
  background: #e2e7ec;
  margin: 0 6px;
}
.group-count {
  font-size: 10px;
  color: #8b97a7;
}
.library-empty {
  text-align: center;
  padding: 90px 20px;
  color: #8995a7;
}
.library-empty i {
  font-size: 35px;
  color: #b1c6dd;
}
.library-empty h3 {
  font-size: 15px;
  margin: 20px 0 10px;
  font-weight: 500;
}
.library-empty p {
  font-size: 12px;
}
</style>
