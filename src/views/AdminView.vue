<template>
  <div class="spa-layout">
    <header class="management-header">
      <div>
        <span>COLLECTION MANAGEMENT</span>
        <h1>数据管理<span>.</span></h1>
        <p>整理、添加和更新你的动漫档案。</p>
      </div>
      <button
        v-if="currentView !== 'add'"
        class="subtle-button"
        :disabled="listLoading"
        @click="refresh"
      >
        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> 刷新
      </button>
    </header>
    <nav class="management-tabs" aria-label="管理分类">
      <button
        v-for="nav in navItems"
        :key="nav.key"
        :class="{ active: currentView === nav.key }"
        :aria-current="currentView === nav.key ? 'page' : undefined"
        @click="switchNav(nav.key)"
      >
        <i :class="nav.icon" aria-hidden="true"></i>{{ nav.label }}
      </button>
    </nav>
    <main class="main-viewport">
      <section v-show="currentView !== 'add'" class="sub-view">
        <div class="order-container">
          <div class="results-top-bar desktop-only">
            <h2 class="page-title">{{ viewTitle }}</h2>
          </div>
          <div
            class="table-wrapper custom-scrollbar desktop-only"
            data-cover-scroll-root
            :aria-busy="listLoading"
          >
            <p v-if="listError" class="list-error" role="alert">
              {{ listError }} <button class="subtle-button" @click="refresh">重试</button>
            </p>
            <table class="modern-table">
              <thead>
                <tr>
                  <th>封面</th>
                  <th>动漫名称</th>
                  <th>集数</th>
                  <th>看完日期</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="animeList.length === 0">
                  <td colspan="6" class="empty-cell">
                    {{
                      listLoading
                        ? '正在加载…'
                        : listError
                          ? '暂时无法读取数据'
                          : '这里还没有动漫记录'
                    }}
                  </td>
                </tr>
                <tr v-for="anime in animeList" :key="anime.id">
                  <td>
                    <img
                      v-lazy-cover="getCoverImageUrl(anime.coverImage)"
                      decoding="async"
                      class="anime-cover-thumb"
                      :alt="anime.title"
                    />
                  </td>
                  <td class="title-cell">{{ anime.title }}</td>
                  <td>{{ anime.totalEpisodes }} 集</td>
                  <td class="date-cell">{{ anime.finishDate }}</td>
                  <td>
                    <span v-if="anime.isFavorite" class="status-pill favorite">最爱</span>
                    <span v-if="anime.isWatching" class="status-pill watching">在追</span>
                    <span v-if="!anime.isWatching" class="status-pill finished">已看</span>
                  </td>
                  <td>
                    <button
                      v-if="!isDemoAccount"
                      class="workbench-button is-ghost btn-edit"
                      @click="openEditModal(anime.id)"
                    >
                      <i class="fa-solid fa-pen-to-square"></i>
                      编辑
                    </button>
                    <button
                      v-if="!isDemoAccount"
                      class="workbench-button is-ghost is-danger btn-delete"
                      @click="handleDelete(anime.id)"
                    >
                      <i class="fa-solid fa-trash"></i>
                      删除
                    </button>
                    <span v-if="isDemoAccount" class="readonly-tag">
                      <i class="fa-solid fa-eye"></i>
                      只读
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <Pagination
              :total-pages="totalPages"
              :current-page="currentPage"
              @change="loadList(currentView, $event)"
            />
          </div>
        </div>
      </section>
      <section v-show="currentView === 'add'" class="sub-view">
        <div class="order-container">
          <section class="search-landing">
            <div class="hero-content">
              <div class="badge">limange</div>
              <h1 class="main-title">动漫添加中心</h1>
              <p class="sub-title">请输入动漫的标题进行后续添加步骤</p>
              <div class="search-container">
                <div class="modern-search-bar">
                  <i class="fa-solid fa-magnifying-glass"></i>
                  <input
                    v-model="addTitle"
                    type="text"
                    placeholder="请输入动漫标题进行检索..."
                    autocomplete="off"
                    @keypress.enter="handleSearch"
                    @input="clearSearch"
                  />
                  <button @click="handleSearch" :disabled="isSearching">
                    <i v-if="isSearching" class="fa-solid fa-spinner fa-spin"></i>
                    <span v-if="!isSearching">检索</span>
                  </button>
                </div>
                <transition name="fade-down">
                  <div v-if="searchResults !== null" class="search-results-dropdown">
                    <div
                      v-if="searchResults.length > 0"
                      class="result-list custom-scrollbar"
                      data-cover-scroll-root
                    >
                      <div
                        v-for="(item, index) in searchResults"
                        :key="index"
                        class="result-item"
                        @click="handleSelectTmdb(item)"
                      >
                        <img
                          v-if="item.coverImage"
                          v-lazy-cover="getCoverImageUrl(item.coverImage)"
                          decoding="async"
                          :alt="item.title"
                          class="result-cover"
                        />
                        <div v-else class="result-cover fallback-cover">
                          <i class="fa-solid fa-image"></i>
                        </div>
                        <div class="result-info">
                          <h4 class="result-title">{{ item.title }}</h4>
                          <p class="result-desc">{{ item.description || '暂无简介' }}</p>
                          <span class="result-meta">集数: {{ item.episodes || '未知' }}</span>
                        </div>
                        <div class="result-action">
                          <i class="fa-solid fa-plus"></i>
                        </div>
                      </div>
                    </div>
                    <div v-else class="no-results">
                      <i class="fa-solid fa-ghost"></i>
                      未找到相关动漫数据
                    </div>
                    <div class="manual-add-option" @click="openAddModal">
                      <i class="fa-solid fa-pen-to-square"></i>
                      不想通过TMDB？点击这里自行添加
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-backdrop show" @click.self="closeAddModal">
        <div class="custom-modal" role="dialog" aria-modal="true" aria-label="完善动漫信息">
          <div class="modal-header">
            <div>
              <div class="modal-title">完善动漫信息</div>
              <div class="modal-subtitle">
                正在添加:
                <span class="highlight">{{ addTitle }}</span>
              </div>
            </div>
            <button class="btn-close icon-button" aria-label="关闭表单" @click="closeAddModal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="modal-body custom-scrollbar">
            <form ref="addFormRef">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">总集数</label>
                  <input v-model="addForm.episodes" type="number" class="form-input" required />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">看完/记录日期</label>
                  <input v-model="addForm.finishDate" type="date" class="form-input" required />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">状态标记</label>
                <div class="checkbox-row">
                  <label class="checkbox-label">
                    <input v-model="addForm.isFavorite" type="checkbox" />
                    最喜欢
                  </label>
                  <label class="checkbox-label">
                    <input v-model="addForm.isWatching" type="checkbox" />
                    正在追
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">描述/备注</label>
                <textarea
                  v-model="addForm.description"
                  class="form-input"
                  rows="3"
                  placeholder="写点什么..."
                >
                </textarea>
              </div>
              <div class="form-group">
                <label class="form-label">封面图片</label>
                <div class="upload-trigger" @click="triggerUpload">
                  <i class="fa-solid fa-cloud-arrow-up upload-icon"></i>
                  <p class="upload-text">点击上传封面 (JPG/PNG)</p>
                </div>
                <input
                  ref="addFileInput"
                  type="file"
                  accept="image/*"
                  style="display: none"
                  @change="handleAddFileChange"
                />
                <div class="preview-box">
                  <img v-if="addPreviewUrl" :src="addPreviewUrl" class="preview-img" alt="预览" />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="workbench-button btn-secondary" @click="closeAddModal">取消</button>
            <button class="workbench-button is-primary btn-primary" @click="submitAdd">
              确认保存
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <Transition name="edit-drawer">
        <div
          v-if="showEditModal"
          class="modal-backdrop edit-drawer-backdrop show"
          @click.self="closeEditModal"
        >
          <section
            ref="editDrawerRef"
            class="custom-modal edit-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-drawer-title"
            @keydown.esc.stop.prevent="closeEditModal"
            @keydown.tab="trapEditFocus"
          >
            <div class="modal-header">
              <div>
                <span class="drawer-caption">动漫档案 / EDIT</span>
                <h2 id="edit-drawer-title" class="modal-title">编辑动漫信息</h2>
                <div class="modal-subtitle">更新作品信息、观看状态与封面。</div>
              </div>
              <button class="btn-close icon-button" aria-label="关闭表单" @click="closeEditModal">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="modal-body custom-scrollbar">
              <form>
                <div class="form-group">
                  <label class="form-label">动漫标题</label>
                  <input v-model="editForm.title" type="text" class="form-input" required />
                </div>
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label">总集数</label>
                    <input v-model="editForm.episodes" type="number" class="form-input" required />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label">看完/记录日期</label>
                    <input v-model="editForm.finishDate" type="date" class="form-input" required />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">状态标记</label>
                  <div class="checkbox-row">
                    <label class="checkbox-label">
                      <input v-model="editForm.isFavorite" type="checkbox" />
                      最喜欢
                    </label>
                    <label class="checkbox-label">
                      <input v-model="editForm.isWatching" type="checkbox" />
                      正在追
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">描述/备注</label>
                  <textarea v-model="editForm.description" class="form-input" rows="3"> </textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">封面图片</label>
                  <div class="upload-trigger" @click="triggerEditUpload">
                    <i class="fa-solid fa-cloud-arrow-up upload-icon"></i>
                    <p class="upload-text">点击更换封面</p>
                  </div>
                  <input
                    ref="editFileInput"
                    type="file"
                    accept="image/*"
                    style="display: none"
                    @change="handleEditFileChange"
                  />
                  <div class="preview-box">
                    <img
                      v-if="editPreviewUrl"
                      :src="editPreviewUrl"
                      class="preview-img"
                      alt="预览"
                    />
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button class="workbench-button btn-secondary" @click="closeEditModal">取消</button>
              <button class="workbench-button is-primary btn-primary" @click="submitEdit">
                保存修改
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import Pagination from '@/components/admin/Pagination.vue';
import { animeApi } from '@/api/anime';
import { useNotify } from '@/composables/useNotify';
import { getFullImageUrl, getCoverImageUrl } from '@/utils/constants';
import { vLazyCover } from '@/utils/lazyCover';
import { useAuthStore } from '@/stores/auth';

const { message, confirm } = useNotify();
const emit = defineEmits(['data-changed']);
const listLoading = ref(false);
const listError = ref('');
let listRequest = 0;
const authStore = useAuthStore();

/** 当前登录账号是否为演示账户，演示账户仅允许读取数据 */
const isDemoAccount = computed(() => authStore.isDemo);

/** 原始导航项配置 */
const baseNavItems = [
  { key: 'add', label: '添加新番', icon: 'fa-solid fa-plus' },
  { key: 'all', label: '全部记录', icon: 'fa-solid fa-list-ul' },
  { key: 'favorite', label: '最喜欢的动漫', icon: 'fa-solid fa-heart' },
  { key: 'watching', label: '正在追的动漫', icon: 'fas fa-running' }
];

/** 导航项配置：演示账户隐藏写入入口 */
const navItems = computed(() =>
  isDemoAccount.value ? baseNavItems.filter((item) => item.key !== 'add') : baseNavItems
);

/** 当前视图 */
const currentView = ref(isDemoAccount.value ? 'all' : 'add');
const currentPage = ref(1);
const totalPages = ref(1);
const animeList = ref([]);

/** 视图标题 */
const viewTitle = computed(() => {
  const titles = {
    all: '所有动漫数据',
    favorite: '最喜欢的动漫',
    watching: '正在追的动漫'
  };
  return titles[currentView.value] || '动漫数据';
});

/** 添加动漫相关状态 */
const addTitle = ref('');
const showAddModal = ref(false);
const addFileInput = ref(null);
const addPreviewUrl = ref('');
const searchResults = ref(null);
const isSearching = ref(false);

const addForm = reactive({
  episodes: 12,
  finishDate: '',
  isFavorite: false,
  isWatching: false,
  description: '',
  coverImageUrl: ''
});
let addCoverFile = null;

function clearSearch() {
  searchResults.value = null;
}

/**
 * 触发TMDB动漫检索
 * 根据用户输入的名称向后端请求 TMDB API 数据
 */
async function handleSearch() {
  if (isDemoAccount.value) {
    message({ content: '演示账户仅可查看数据，不能新增内容', type: 'error' });
    return;
  }

  const title = addTitle.value.trim();
  if (!title) {
    message({ content: '请输入动漫标题进行检索！', type: 'error' });
    return;
  }

  isSearching.value = true;
  searchResults.value = null;
  try {
    const res = await animeApi.searchTmdb(title);
    // 状态码 200: 成功从TMDB获取到数据，赋值给下拉列表展示
    if (res.status === 200 && res.data) {
      searchResults.value = Array.isArray(res.data) ? res.data : [];
    }
    // 状态码 204: TMDB未找到匹配项，或者后端未配置API Key，展示空状态
    else if (res.status === 204) {
      searchResults.value = [];
    } else {
      searchResults.value = [];
    }
  } catch (err) {
    // 接口报错时也视为无结果，防止阻塞用户使用“手动添加”路径
    searchResults.value = [];
  } finally {
    isSearching.value = false; // 解除按钮的 Loading 状态
  }
}

/**
 * 选择TMDB检索结果
 * 自动回填数据到新增表单中，并打开模态框
 */
function handleSelectTmdb(item) {
  if (isDemoAccount.value) {
    message({ content: '演示账户禁止修改数据', type: 'error' });
    return;
  }

  // 将选中的 TMDB 数据映射回填至本地表单对象
  addTitle.value = item.title;
  addForm.episodes = item.episodes || 12;
  addForm.description = item.description || '';

  // 记录 TMDB 图片 URL，供后端直接下载或保存
  addForm.coverImageUrl = item.coverImage || '';
  addPreviewUrl.value = item.coverImage || ''; // 在模态框中预览此图片

  // 隐藏下拉检索结果，并弹出确认编辑的模态窗口
  searchResults.value = null;
  showAddModal.value = true;
}

/** 编辑动漫相关状态 */
const showEditModal = ref(false);
const editDrawerRef = ref(null);
let editTrigger = null;
const editFileInput = ref(null);
const editPreviewUrl = ref('');
const editForm = reactive({
  id: null,
  title: '',
  episodes: 12,
  finishDate: '',
  isFavorite: false,
  isWatching: false,
  description: ''
});
let editCoverFile = null;

/**
 * 将任意页码规整到安全范围，避免异常入参触发越界分页请求。
 * @param {unknown} page - 待处理页码
 * @param {unknown} total - 总页数
 * @returns {number} 安全页码
 */
function clampPage(page, total = totalPages.value) {
  const safeTotal = Math.max(1, Math.trunc(Number(total)) || 1);
  const safePage = Math.trunc(Number(page)) || 1;
  return Math.min(Math.max(safePage, 1), safeTotal);
}

/**
 * 切换导航视图
 */
function switchNav(key) {
  if (isDemoAccount.value && key === 'add') {
    message({ content: '演示账户仅可查看数据，不能新增内容', type: 'error' });
    return;
  }

  if (!navItems.value.some((item) => item.key === key)) return;
  listRequest++;
  listLoading.value = false;
  listError.value = '';
  currentView.value = key;
  if (key !== 'add') {
    currentPage.value = 1;
    loadList(key, 1);
  }
}

/**
 * 加载动漫列表
 */
async function loadList(type, page) {
  const request = ++listRequest;
  listLoading.value = true;
  listError.value = '';
  try {
    const safeRequestPage = clampPage(page);
    const res = await animeApi.getAdminList(type, safeRequestPage);
    if (request !== listRequest) return;
    const data = res?.data || {};
    const safeTotalPages = Math.max(1, Math.trunc(Number(data.totalPages)) || 1);
    const backendPage = Math.trunc(Number(data.number)) + 1;

    animeList.value = Array.isArray(data.content) ? data.content : [];
    totalPages.value = safeTotalPages;
    currentPage.value = clampPage(
      Number.isFinite(backendPage) ? backendPage : safeRequestPage,
      safeTotalPages
    );
  } catch (err) {
    if (request === listRequest) listError.value = '读取失败，请检查后端服务或网络。';
  } finally {
    if (request === listRequest) listLoading.value = false;
  }
}

function refresh() {
  if (currentView.value === 'add') return;
  return loadList(currentView.value, currentPage.value);
}

defineExpose({ refresh });

/**
 * 添加动漫 - 打开模态窗口
 */
function openAddModal() {
  if (isDemoAccount.value) {
    message({ content: '演示账户禁止修改数据', type: 'error' });
    return;
  }

  const title = addTitle.value.trim();
  if (!title) {
    message({ content: '请输入动漫标题！', type: 'error' });
    return;
  }
  searchResults.value = null;
  showAddModal.value = true;
}

/**
 * 添加动漫 - 关闭模态窗口
 */
function closeAddModal() {
  revokePreview(addPreviewUrl.value);
  showAddModal.value = false;
  resetAddForm();
}

/** 重置添加表单 */
function resetAddForm() {
  addForm.episodes = 12;
  addForm.finishDate = '';
  addForm.isFavorite = false;
  addForm.isWatching = false;
  addForm.description = '';
  addForm.coverImageUrl = '';
  addPreviewUrl.value = '';
  addCoverFile = null;
  addTitle.value = '';
  searchResults.value = null;
}

/** 触发文件上传 */
function triggerUpload() {
  if (isDemoAccount.value) return;
  addFileInput.value?.click();
}

/**
 * 处理封面文件选择
 * 当用户在“添加/编辑”时主动选择了本地图片，需要覆盖之前的 TMDB 预设图片
 */
function handleAddFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  addCoverFile = file; // 记录本地文件对象用于表单提交
  revokePreview(addPreviewUrl.value);
  addPreviewUrl.value = URL.createObjectURL(file); // 生成本地Blob预览
  addForm.coverImageUrl = ''; // 清空TMDB继承的URL，确保优先使用本地文件
}

/**
 * 添加动漫 - 提交表单
 */
async function submitAdd() {
  if (isDemoAccount.value) {
    message({ content: '演示账户禁止修改数据', type: 'error' });
    return;
  }

  if (!addForm.episodes || !addForm.finishDate) {
    message({ content: '请填写集数和日期', type: 'error' });
    return;
  }

  const formData = new FormData();
  formData.append('title', addTitle.value);
  formData.append('episodes', addForm.episodes);
  formData.append('finishDate', addForm.finishDate);
  formData.append('isFavorite', addForm.isFavorite);
  formData.append('isWatching', addForm.isWatching);
  formData.append('description', addForm.description);

  // 封面提交逻辑分支：
  // 如果用户主动上传了文件，优先发送文件对象
  if (addCoverFile) {
    formData.append('coverImage', addCoverFile);
  }
  // 否则，如果之前通过 TMDB 检索保留了网络URL，则提交此URL供后端处理
  else if (addForm.coverImageUrl) {
    formData.append('coverImageUrl', addForm.coverImageUrl);
  }

  try {
    await animeApi.addAnime(formData);
    emit('data-changed');
    message({ content: '添加成功！', type: 'success' });
    closeAddModal();
    loadList('all', 1);
    currentView.value = 'all';
  } catch (err) {
    message({ content: '添加失败: ' + (err.response?.data || '未知错误'), type: 'error' });
  }
}

/**
 * 打开编辑模态窗口
 */
async function openEditModal(id) {
  if (isDemoAccount.value) {
    message({ content: '演示账户禁止修改数据', type: 'error' });
    return;
  }

  editTrigger = document.activeElement;

  try {
    const res = await animeApi.getAnimeDetail(id);
    const anime = res.data;

    editForm.id = anime.id;
    editForm.title = anime.title;
    editForm.episodes = anime.totalEpisodes;
    editForm.finishDate = anime.finishDate;
    editForm.isFavorite = anime.isFavorite;
    editForm.isWatching = anime.isWatching;
    editForm.description = anime.description || '';

    if (anime.coverImage) {
      editPreviewUrl.value = getFullImageUrl(anime.coverImage);
    } else {
      editPreviewUrl.value = '';
    }

    showEditModal.value = true;
    await nextTick();
    editDrawerRef.value?.querySelector('input')?.focus({ preventScroll: true });
  } catch (err) {
    message({ content: '数据获取失败', type: 'error' });
  }
}

/** 关闭编辑窗口 */
function closeEditModal() {
  revokePreview(editPreviewUrl.value);
  showEditModal.value = false;
  editCoverFile = null;
  if (editTrigger?.isConnected) editTrigger.focus({ preventScroll: true });
  editTrigger = null;
}

/** 抽屉内循环移动焦点，避免 Tab 跳入遮罩后的记录列表。 */
function trapEditFocus(event) {
  const controls = [...editDrawerRef.value.querySelectorAll('button, input, textarea')].filter(
    (element) => !element.disabled && element.getClientRects().length > 0
  );
  const currentIndex = controls.indexOf(document.activeElement);
  const nextIndex = (currentIndex + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
  event.preventDefault();
  controls[nextIndex]?.focus();
}

/** 触发编辑文件上传 */
function triggerEditUpload() {
  if (isDemoAccount.value) return;
  editFileInput.value?.click();
}

/** 处理编辑封面文件选择 */
function handleEditFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  editCoverFile = file;
  revokePreview(editPreviewUrl.value);
  editPreviewUrl.value = URL.createObjectURL(file);
}

/**
 * 编辑动漫 - 提交表单
 */
async function submitEdit() {
  if (isDemoAccount.value) {
    message({ content: '演示账户禁止修改数据', type: 'error' });
    return;
  }

  const formData = new FormData();
  formData.append('id', editForm.id);
  formData.append('title', editForm.title);
  formData.append('episodes', editForm.episodes);
  formData.append('finishDate', editForm.finishDate);
  formData.append('isFavorite', editForm.isFavorite);
  formData.append('isWatching', editForm.isWatching);
  formData.append('description', editForm.description);
  if (editCoverFile) {
    formData.append('coverImage', editCoverFile);
  }

  try {
    await animeApi.updateAnime(formData);
    emit('data-changed');
    message({ content: '修改成功！', type: 'success' });
    closeEditModal();
    loadList(currentView.value, currentPage.value);
  } catch (err) {
    message({ content: '修改失败: ' + (err.response?.data || '未知错误'), type: 'error' });
  }
}

/**
 * 删除动漫（带确认）
 */
async function handleDelete(id) {
  if (isDemoAccount.value) {
    message({ content: '演示账户禁止修改数据', type: 'error' });
    return;
  }

  const anime = animeList.value.find((item) => item.id === id);
  const isConfirm = await confirm({
    title: '删除动漫记录',
    content: `确定删除「${anime?.title || '这条记录'}」吗？此操作无法撤销。`,
    confirmText: '删除记录'
  });
  if (!isConfirm) return;

  try {
    await animeApi.deleteAnime(id);
    emit('data-changed');
    message({ content: '删除成功！', type: 'success' });
    loadList(currentView.value, currentPage.value);
  } catch (err) {
    message({ content: '删除失败', type: 'error' });
  }
}

function revokePreview(url) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

onBeforeUnmount(() => {
  listRequest++;
  revokePreview(addPreviewUrl.value);
  revokePreview(editPreviewUrl.value);
});

onMounted(() => {
  if (currentView.value !== 'add') {
    loadList(currentView.value, 1);
  }
});
</script>

<style scoped>
.spa-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: transparent;
}
.management-header {
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  align-items: center;
  padding: 27px 32px 23px;
}
.management-header > div > span {
  color: #8992a1;
  font-size: 9px;
  letter-spacing: 1.5px;
}
.management-header h1 {
  font-size: 28px;
  font-weight: 650;
  margin: 9px 0 7px;
  letter-spacing: -1px;
}
.management-header h1 span {
  color: #2386e5;
}
.management-header p {
  font-size: 11px;
  color: #8992a1;
}
.management-tabs {
  display: flex;
  flex-shrink: 0;
  margin: 0 32px;
  border-bottom: 1px solid var(--border);
}
.management-tabs button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-size: 11px;
  color: #8190a2;
}
.management-tabs button.active {
  border-bottom-color: #3186d7;
  color: #247dcc;
}
.main-viewport {
  flex: 1;
  min-height: 0;
  display: flex;
  width: 100%;
}
.sub-view {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.order-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: transparent;
}
.results-top-bar {
  padding: 20px 32px 12px;
  flex-shrink: 0;
}
.page-title {
  font-size: 12px;
  font-weight: 500;
  color: #8290a1;
}
.list-error {
  padding: 16px;
  background: #fff2f0;
  color: #a04f43;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

/* 表格 */

.table-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0 32px 20px;
  min-height: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.modern-table {
  text-align: left;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid var(--border);
}

.modern-table th {
  text-align: left;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
}

.modern-table tbody tr td {
  text-align: left;
  padding: 12px 20px;
  font-size: 15px;
  background: #fff;
  transition: border-color 0.2s;
  border-top: 1.5px solid transparent;
  border-bottom: 1.5px solid transparent;
  vertical-align: middle;
  color: #333;
}

.modern-table tbody tr td:first-child {
  border-left: 1.5px solid transparent;
  border-radius: 10px 0 0 10px;
}

.modern-table tbody tr td:last-child {
  border-right: 1.5px solid transparent;
  border-radius: 0 10px 10px 0;
}

.modern-table tbody tr:hover td {
  border-top-color: #2563eb;
  border-bottom-color: #2563eb;
}

.modern-table tbody tr:hover td:first-child {
  border-left-color: #2563eb;
}

.modern-table tbody tr:hover td:last-child {
  border-right-color: #2563eb;
}

.anime-cover-thumb {
  width: 80px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: block;
}

.title-cell {
  font-weight: 600;
  color: #1e293b;
}

.date-cell {
  color: #64748b;
}

.empty-cell {
  text-align: center !important;
  color: #999;
  padding: 40px !important;
  border: none !important;
}

.status-pill {
  padding: 4px 12px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 500;
}

.status-pill.favorite {
  background: #fce7f3;
  color: #db2777;
  margin-right: 5px;
}

.status-pill.watching {
  background: #eff6ff;
  color: #2563eb;
}

.status-pill.finished {
  background: #ecfdf5;
  color: #059669;
}

.readonly-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  background: rgba(100, 116, 139, 0.1);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
}

/* 添加页面 */

.search-landing {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding-bottom: 10vh;
}

.hero-content {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 50px;
  margin-bottom: 15px;
  text-align: center;
}

.main-title {
  font-size: 42px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 12px;
}

.sub-title {
  color: #6b7280;
  font-size: 16px;
  margin-bottom: 40px;
}

.search-container {
  position: relative;
  width: 600px;
  max-width: 100%;
  margin: 0 auto;
}

.modern-search-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 8px 8px 8px 24px;
  border-radius: 100px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  width: 100%;
  box-sizing: border-box;
  transition: 0.3s;
}

.modern-search-bar:focus-within {
  border-color: #2563eb;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1);
}

.modern-search-bar > i {
  color: #9ca3af;
  margin-right: 15px;
  font-size: 18px;
}

.modern-search-bar input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 16px;
  color: #1f2937;
  background: transparent;
}

.modern-search-bar button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 12px 35px;
  border-radius: 100px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
}

.modern-search-bar button i {
  color: #fff;
  margin-right: 0;
  font-size: 16px;
}

.modern-search-bar button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.search-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  margin-top: 15px;
  overflow: hidden;
  z-index: 100;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.result-list {
  /* 
   * 限制最大高度，仅显示大约 2 条数据 (每条约 100px)
   * 超过部分出现垂直滚动条
   */
  max-height: 200px;
  overflow-y: auto;
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.result-item {
  display: flex;
  padding: 15px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background 0.2s;
  align-items: center;
}

.result-item:hover {
  background: #f8fafc;
}

.result-cover {
  width: 50px;
  height: 70px;
  object-fit: cover;
  border-radius: 6px;
  margin-right: 15px;
  flex-shrink: 0;
  background: #e2e8f0;
}

.fallback-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 20px;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 5px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 5px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.result-meta {
  font-size: 12px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.result-action {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 15px;
  opacity: 0;
  transition: 0.2s;
}

.result-item:hover .result-action {
  opacity: 1;
}

.no-results {
  padding: 30px 20px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.manual-add-option {
  padding: 15px;
  text-align: center;
  color: #2563eb;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
  background: #f8fafc;
}

.manual-add-option:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

/* 编辑与添加弹窗沿用 PVE 的标题、内容、页脚三段布局。 */
.modal-backdrop {
  position: fixed;
  inset: var(--app-titlebar-height) 0 0;
  padding: 24px;
  background: var(--overlay);
  backdrop-filter: blur(2px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.15s ease;
}
.modal-backdrop.show {
  opacity: 1;
  visibility: visible;
}
.custom-modal {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  box-shadow: 0 24px 80px #18233433;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}
.modal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.modal-subtitle {
  margin-top: 5px;
  font-size: 11px;
  color: var(--sys-text-secondary);
}
.highlight {
  color: var(--ink);
}
.modal-body {
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--panel);
}
.modal-header,
.modal-footer {
  flex-shrink: 0;
}

/* 编辑抽屉贴右展开，内容独立滚动，窗口栏和保存操作始终可见。 */
.edit-drawer-backdrop {
  justify-content: flex-end;
  padding: 0;
  overflow: hidden;
}
.edit-drawer {
  width: min(660px, 100%);
  height: 100%;
  border-width: 0 0 0 1px;
  box-shadow: -24px 0 80px #18233426;
  transform: translateX(0);
  transition: transform 0.2s ease;
}
.edit-drawer-enter-active,
.edit-drawer-leave-active {
  transition: opacity 0.2s ease;
}
.edit-drawer-enter-from,
.edit-drawer-leave-to {
  opacity: 0;
}
.edit-drawer-enter-from .edit-drawer,
.edit-drawer-leave-to .edit-drawer {
  transform: translateX(100%);
}
.edit-drawer .modal-header {
  padding: 24px;
  background: var(--surface);
}
.drawer-caption {
  display: block;
  margin-bottom: 10px;
  color: var(--sys-text-secondary);
  font-size: 10px;
  letter-spacing: 1px;
}
.edit-drawer .modal-title {
  font-size: 22px;
}
.edit-drawer .modal-body {
  flex: 1;
  padding: 24px;
}
.edit-drawer .modal-footer {
  padding: 16px 24px;
}

/* 表单 */

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 7px;
  font-size: 12px;
  color: #475569;
  font-weight: 600;
}

.form-input {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid #d8e0e9;
  border-radius: 0;
  outline: none;
  transition: 0.2s;
  font-size: 12px;
  background: #fff;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-row {
  display: flex;
  gap: 20px;
}

.flex-1 {
  flex: 1;
}

.checkbox-row {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 10px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #475569;
}

.checkbox-label input {
  transform: scale(1.2);
}

.upload-trigger {
  border: 1px dashed var(--border-strong);
  border-radius: 0;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: 0.2s;
}

.upload-trigger:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.upload-icon {
  font-size: 24px;
  color: #94a3b8;
}

.upload-text {
  color: #64748b;
  font-size: 13px;
  margin-top: 5px;
}

.preview-box img {
  max-height: 150px;
  border-radius: 8px;
  margin-top: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-img {
  display: block;
  max-height: 150px;
  border-radius: 8px;
  margin-top: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.desktop-only {
  display: block;
}
</style>

<style scoped>
.modern-table th {
  background: #f1f4f8;
  color: #718298;
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 1;
}
.modern-table tbody tr td {
  border: 0;
  border-bottom: 1px solid #edf0f4;
  font-size: 12px;
  border-radius: 0 !important;
  background: #fffffff5;
}
.modern-table tbody tr:hover td {
  background: #f5f9fd;
}
.anime-cover-thumb {
  width: 38px;
  height: 51px;
  border-radius: 2px;
  object-fit: cover;
  background: #eaf0f6;
}
.modern-table td:last-child {
  white-space: nowrap;
}
.btn-edit {
  margin-right: 4px;
}
.status-pill {
  border-radius: 2px;
  font-size: 10px;
}
.search-landing {
  background: none;
  overflow-y: auto;
}
.main-title {
  font-size: 30px;
  font-weight: 600;
}
.modern-search-bar {
  border-radius: 3px;
  box-shadow: 0 5px 25px #233c5410;
  border: 1px solid #d3dfe9;
}
.modern-search-bar button {
  border-radius: 2px;
}
.search-results-dropdown {
  border-radius: 3px;
}
</style>
