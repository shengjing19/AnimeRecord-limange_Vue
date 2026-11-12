<template>
  <div class="workspace-tabs" role="tablist" aria-label="工作区切换" @keydown="handleKeydown">
    <button
      v-for="item in tabs"
      :id="'tab-' + item.key"
      :key="item.key"
      role="tab"
      :aria-selected="activeTab === item.key"
      aria-controls="workspace-panel"
      :tabindex="activeTab === item.key ? 0 : -1"
      :class="{ active: activeTab === item.key }"
      @click="$emit('change', item)"
    >
      <i :class="item.icon" aria-hidden="true"></i>{{ item.label
      }}<span v-if="counts[item.key] != null" class="tab-count">{{ counts[item.key] }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { WORKSPACE_TABS, getWorkspaceTab } from '@/utils/workspace';

const props = defineProps({ activeTab: String, counts: { type: Object, default: () => ({}) } });
const emit = defineEmits(['change']);
const tabs = computed(() =>
  ['settings', 'about'].includes(props.activeTab)
    ? [...WORKSPACE_TABS.slice(0, 5), getWorkspaceTab(props.activeTab)]
    : WORKSPACE_TABS.slice(0, 5)
);

function handleKeydown(event) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();

  const buttons = [...event.currentTarget.querySelectorAll('[role=tab]')];
  const index = buttons.indexOf(document.activeElement);
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;

  buttons[next].focus();
  emit('change', tabs.value[next]);
}
</script>

<style scoped>
.workspace-tabs {
  display: flex;
  flex-shrink: 0;
  height: 49px;
  gap: 5px;
  padding: 0 19px;
  overflow-x: auto;
  background: #fff;
  border-bottom: 1px solid var(--border);
}
button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  position: relative;
  white-space: nowrap;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  color: #778293;
  font-size: 11px;
}
button:hover {
  color: #2386e5;
  background: #f8fafc;
}
button.active {
  color: #1e70bd;
  border-bottom-color: #2386e5;
}
button i {
  font-size: 11px;
}
.tab-count {
  background: #f3f5f8;
  color: #76859a;
  font-size: 9px;
  padding: 2px 5px;
  font-variant-numeric: tabular-nums;
}
.active .tab-count {
  background: #ecf4fd;
  color: #3587d6;
}
</style>
