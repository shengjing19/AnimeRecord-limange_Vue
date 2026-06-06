<template>
  <!--
    Pagination.vue - 分页组件
    智能折叠式分页，适配大量页码场景
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <div v-if="totalPages > 1" class="pagination-container">
    <template v-for="item in pageItems" :key="item">
      <span v-if="item === '...'" class="pagination-dots">...</span>
      <button
        v-else
        :class="['pagination-btn', { active: item === currentPage }]"
        @click="changePage(item)"
      >
        {{ item }}
      </button>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  /** 总页数 */
  totalPages: { type: Number, default: 1 },
  /** 当前页码 */
  currentPage: { type: Number, default: 1 }
});

const emit = defineEmits(['change']);

/**
 * 计算显示的页码项目列表（含省略号）
 * 折叠规则-少于7页全显示，否则只显示首尾和中间部分
 */
const pageItems = computed(() => {
  const total = props.totalPages;
  const current = props.currentPage;

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = Math.max(2, current - 2);
  let end = Math.min(total - 1, current + 2);

  if (current <= 4) {
    start = 2; end = 5;
  }
  if (current >= total - 3) {
    start = total - 4; end = total - 1;
  }

  const result = [1];

  if (start > 2) result.push('...');
  for (let i = start; i <= end; i++) result.push(i);
  if (end < total - 1) result.push('...');

  result.push(total);
  return result;
});

function changePage(page) {
  if (page !== props.currentPage) {
    emit('change', page);
  }
}
</script>

<style scoped>
.pagination-container {
  padding: 20px 0;
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.pagination-btn {
  background: white;
  border: 1px solid #ddd;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: 0.2s;
}

.pagination-btn:hover {
  background: #f4f4f4;
  color: #333;
}

.pagination-btn.active {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}

.pagination-dots {
  padding: 6px 12px;
  color: #94a3b8;
  font-weight: bold;
}
</style>
