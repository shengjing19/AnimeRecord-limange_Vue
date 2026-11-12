<template>
  <header class="app-header">
    <div>
      <div class="page-eyebrow">MY ANIME COLLECTION <span> / </span> {{ title }}</div>
      <h1>{{ title }}<span class="title-dot">.</span></h1>
      <p>{{ description }}</p>
    </div>
    <div class="header-actions">
      <span v-if="count != null" class="record-count"
        ><strong>{{ count }}</strong> 部作品</span
      ><button class="subtle-button" :disabled="loading" @click="$emit('refresh')">
        <i :class="['fa-solid fa-rotate-right', { 'fa-spin': loading }]" aria-hidden="true"></i>
        刷新
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({ title: String, description: String, count: Number, loading: Boolean });
defineEmits(['refresh']);
</script>

<style scoped>
.app-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 27px 32px 25px;
}
.page-eyebrow {
  font-size: 9px;
  letter-spacing: 1.5px;
  color: #8992a1;
}
.page-eyebrow span {
  padding: 0 10px;
  color: #b6c0cc;
}
h1 {
  font-size: 28px;
  font-weight: 650;
  letter-spacing: -1px;
  margin: 9px 0 7px;
}
.title-dot {
  color: #2386e5;
  margin-left: 3px;
}
p {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.3px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}
.record-count {
  font-size: 10px;
  color: var(--muted);
}
.record-count strong {
  font-size: 20px;
  font-weight: 500;
  margin-right: 4px;
  color: var(--ink);
}
</style>
