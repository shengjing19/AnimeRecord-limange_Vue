<template>
  <form class="server-settings" @submit.prevent="save">
    <label :for="inputId">后端服务地址</label>
    <p>填写 Newlimange 后端地址。更换服务后需要重新登录。</p>
    <div>
      <input
        :id="inputId"
        v-model="serverUrl"
        type="url"
        required
        placeholder="http://127.0.0.1:8231"
        :disabled="saving"
      /><button class="subtle-button" :disabled="saving">
        {{ saving ? '保存中…' : '保存地址' }}
      </button>
    </div>
    <span v-if="error" class="server-error" role="alert">{{ error }}</span><span
      v-else-if="saved"
      class="server-success"
      role="status"
      >地址已保存</span
    >
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { getServerUrl, saveServerUrl } from '@/utils/server';
import { useAuthStore } from '@/stores/auth';
import { useNotify } from '@/composables/useNotify';

defineProps({ inputId: { type: String, default: 'backend-server-url' } });
const serverUrl = ref(getServerUrl());
const error = ref('');
const saved = ref(false);
const saving = ref(false);
const auth = useAuthStore();
const { confirm } = useNotify();

async function save() {
  if (saving.value) return;
  error.value = '';
  saved.value = false;
  if (auth.isLoggedIn && !(await confirm({ content: '更换后端服务会退出当前账户，是否继续？' })))
    return;
  saving.value = true;
  try {
    serverUrl.value = await saveServerUrl(serverUrl.value);
    saved.value = true;
    if (auth.isLoggedIn) auth.logout();
  } catch (err) {
    error.value = err.message || '无法保存地址';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.server-settings {
  padding: 23px;
  border: 1px solid var(--border);
  background: #fff;
}
label {
  font-size: 13px;
  font-weight: 600;
  color: #3a4657;
}
p {
  font-size: 11px;
  color: #8a94a4;
  margin: 7px 0 17px;
}
.server-settings > div {
  display: flex;
  gap: 10px;
}
input {
  flex: 1;
  min-width: 0;
  border: 1px solid #d8e0e9;
  padding: 9px 11px;
  font-size: 12px;
  color: #3a4657;
  background: #fafbfc;
}
.server-error,
.server-success {
  display: block;
  font-size: 11px;
  margin-top: 10px;
}
.server-error {
  color: #cb4654;
}
.server-success {
  color: #269779;
}
</style>
