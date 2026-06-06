<template>
  <!--
    AdminView.vue - 数据管理页面
    动漫数据的增删改查，含搜索添加、列表展示、分页、编辑模态窗口
    by shengjing19(Hisx12123)
    created 2026-05-31
  -->
  <div class="spa-layout">
    <!-- 左侧导航 -->
    <aside class="side-nav">
      <div class="logo-centered-container">
        <div class="logo-brand-row">
          <span class="logo-text">limange DM</span>
        </div>
        <p class="logo-subtitle">数据管理中心</p>
      </div>

      <div
        v-for="nav in navItems"
        :key="nav.key"
        :class="['nav-item', { active: currentView === nav.key }]"
        @click="switchNav(nav.key)"
      >
        <i :class="nav.icon"></i>
        <span>{{ nav.label }}</span>
      </div>

      <div class="nav-divider"></div>
      <div class="nav-info">
        <h3>{{ APP_CONFIG.appName }}&trade;</h3>
        <span>软件版本 {{ APP_CONFIG.version }}</span>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="main-viewport">
      <!-- 移动端专属 Header -->
      <header class="mobile-app-header mobile-only">
        <button class="mobile-back-btn" @click="router.push('/')">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h1 class="mobile-page-title">数据管理</h1>
      </header>

      <!-- 返回主页按钮 (仅桌面端显示) -->
      <button class="back-home-btn desktop-only" @click="router.push('/')">
        <i class="fa-solid fa-arrow-left"></i> 返回主页
      </button>

      <!-- 动漫列表视图 -->
      <section v-show="currentView !== 'add'" class="sub-view">
        <div class="order-container">
          <div class="results-top-bar desktop-only">
            <h2 class="page-title">{{ viewTitle }}</h2>
          </div>

          <!-- 移动端卡片式列表 -->
          <div class="mobile-card-list mobile-only custom-scrollbar">
            <div v-if="animeList.length === 0" class="empty-mobile">暂无数据</div>
            <div v-for="anime in animeList" :key="anime.id" class="admin-mobile-card">
              <div class="card-left">
                <img :src="getFullImageUrl(anime.coverImage)" class="mobile-admin-thumb" />
              </div>
              <div class="card-right">
                <div class="mobile-card-header">
                  <h3 class="mobile-anime-title">{{ anime.title }}</h3>
                  <div class="mobile-status-tag">
                    <span v-if="anime.isFavorite" class="pill fav">最爱</span>
                    <span v-if="anime.isWatching" class="pill watch">在追</span>
                  </div>
                </div>
                <div class="mobile-card-info">
                  <span>{{ anime.totalEpisodes }} 集</span>
                  <span class="dot">·</span>
                  <span>{{ anime.finishDate }}</span>
                </div>
                <div class="mobile-card-actions">
                  <button v-if="!isDemoAccount" @click="openEditModal(anime.id)"><i class="fa-solid fa-pen"></i> 编辑</button>
                  <button v-if="!isDemoAccount" class="del" @click="handleDelete(anime.id)"><i class="fa-solid fa-trash"></i> 删除</button>
                  <span v-if="isDemoAccount" class="readonly-tag">
                    <i class="fa-solid fa-eye"></i> 只读
                  </span>
                </div>
              </div>
            </div>
            <Pagination
              :total-pages="totalPages"
              :current-page="currentPage"
              @change="loadList(currentView, $event)"
            />
          </div>

          <!-- 桌面端表格视图 -->
          <div class="table-wrapper custom-scrollbar desktop-only">
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
                  <td colspan="6" class="empty-cell">暂无数据</td>
                </tr>
                <tr v-for="anime in animeList" :key="anime.id">
                  <td>
                    <img
                      :src="getFullImageUrl(anime.coverImage)"
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
                    <button v-if="!isDemoAccount" class="btn-edit" @click="openEditModal(anime.id)">
                      <i class="fa-solid fa-pen-to-square"></i> 编辑
                    </button>
                    <button v-if="!isDemoAccount" class="btn-delete" @click="handleDelete(anime.id)">
                      <i class="fa-solid fa-trash"></i> 删除
                    </button>
                    <span v-if="isDemoAccount" class="readonly-tag">
                      <i class="fa-solid fa-eye"></i> 只读
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

      <!-- 添加动漫视图 -->
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
                    <span v-else>检索</span>
                  </button>
                </div>
                
                <!-- 检索结果悬浮层 (仅在触发检索后且有结果状态下展示) -->
                <transition name="fade-down">
                  <div v-if="searchResults !== null" class="search-results-dropdown">
                    
                    <!-- 命中结果列表 -->
                    <div v-if="searchResults.length > 0" class="result-list custom-scrollbar">
                      <!-- 遍历后端返回的 TMDB 精简数据源 (含图片/标题/简介) -->
                      <div v-for="(item, index) in searchResults" :key="index" class="result-item" @click="handleSelectTmdb(item)">
                        <img v-if="item.coverImage" :src="item.coverImage" class="result-cover" />
                        <div v-else class="result-cover fallback-cover"><i class="fa-solid fa-image"></i></div>
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
                    
                    <!-- 未命中或接口异常占位 -->
                    <div v-else class="no-results">
                      <i class="fa-solid fa-ghost"></i> 未找到相关动漫数据
                    </div>
                    
                    <!-- 后备选项,允许用户越过TMDB直接手动打开添加面板 -->
                    <div class="manual-add-option" @click="openAddModal">
                      <i class="fa-solid fa-pen-to-square"></i> 不想通过TMDB？点击这里自行添加
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>

    <!-- 添加动漫模态窗口 -->
    <Teleport to="body">
      <div
        :class="['modal-backdrop', { show: showAddModal }]"
      >
        <div class="custom-modal">
          <div class="modal-header">
            <div>
              <div class="modal-title">完善动漫信息</div>
              <div class="modal-subtitle">
                正在添加: <span class="highlight">{{ addTitle }}</span>
              </div>
            </div>
            <button class="btn-close" @click="closeAddModal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="modal-body custom-scrollbar">
            <form ref="addFormRef">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">总集数</label>
                  <input
                    v-model="addForm.episodes"
                    type="number"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">看完/记录日期</label>
                  <input
                    v-model="addForm.finishDate"
                    type="date"
                    class="form-input"
                    required
                  />
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
                ></textarea>
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
                  <img
                    v-if="addPreviewUrl"
                    :src="addPreviewUrl"
                    class="preview-img"
                    alt="预览"
                  />
                </div>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="closeAddModal">取消</button>
            <button class="btn-primary" @click="submitAdd">确认保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 编辑动漫模态窗口 -->
    <Teleport to="body">
      <div
        :class="['modal-backdrop', { show: showEditModal }]"
      >
        <div class="custom-modal">
          <div class="modal-header">
            <div>
              <div class="modal-title">编辑动漫信息</div>
              <div class="modal-subtitle">
                修改 ID: <span>{{ editForm.id }}</span> 的信息
              </div>
            </div>
            <button class="btn-close" @click="closeEditModal">
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
                <textarea
                  v-model="editForm.description"
                  class="form-input"
                  rows="3"
                ></textarea>
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
            <button class="btn-secondary" @click="closeEditModal">取消</button>
            <button class="btn-primary" @click="submitEdit">保存修改</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 移动端-悬浮底部导航栏 -->
    <transition name="dock-slide">
      <nav v-if="!showAddModal && !showEditModal" class="mobile-tab-nav-wrapper mobile-only" :class="{ 'is-collapsed': isDockCollapsed }">
        <!-- 折叠后的触发岛：仅在折叠时显示 -->
        <div v-if="isDockCollapsed" class="expand-trigger-island" @click="isDockCollapsed = false">
          <i class="fa-solid fa-angles-right"></i>
        </div>

        <!-- 主导航岛群 -->
        <div class="dock-container-group" :class="{ 'hiding': isDockCollapsed }">
          <div class="floating-dock">
            <div
              v-for="nav in navItems"
              :key="nav.key"
              :class="['dock-item', { active: currentView === nav.key }]"
              @click="switchNav(nav.key)"
            >
              <i :class="nav.icon"></i>
              <span class="dock-label">{{ nav.label.replace('的动漫', '').replace('新番', '') }}</span>
            </div>
          </div>

          <!-- 折叠按钮岛 -->
          <div class="collapse-island" @click="isDockCollapsed = true">
            <i class="fa-solid fa-chevron-left"></i>
          </div>
        </div>
      </nav>
    </transition>

    <!-- 版本信息 -->
    <div class="version-info desktop-only">
      <span>{{ APP_CONFIG.appName }} {{ APP_CONFIG.copyright }}</span><br />
      <span>Github:{{ APP_CONFIG.github }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Pagination from '@/components/admin/Pagination.vue';
import { animeApi } from '@/api/anime';
import { useNotify } from '@/composables/useNotify';
import { APP_CONFIG, getFullImageUrl } from '@/utils/constants';
import { useAuthStore } from '@/stores/auth';

const { message, confirm } = useNotify();
const router = useRouter();
const authStore = useAuthStore();

/** 当前登录账号是否为演示账户，演示账户仅允许读取数据 */
const isDemoAccount = computed(() => authStore.isDemo);

/** 导航项折叠状态 */
const isDockCollapsed = ref(false);

/** 原始导航项配置 */
const baseNavItems = [
  { key: 'add', label: '添加新番', icon: 'fa-solid fa-plus-circle' },
  { key: 'all', label: '已添加的动漫', icon: 'fa-solid fa-list-ul' },
  { key: 'favorite', label: '最喜欢的动漫', icon: 'fa-solid fa-heart' },
  { key: 'watching', label: '正在追的动漫', icon: 'fas fa-running' }
];

/** 导航项配置：演示账户隐藏写入入口 */
const navItems = computed(() =>
  isDemoAccount.value ? baseNavItems.filter((item) => item.key !== 'add') : baseNavItems
);

/** 当前视图 */
const currentView = ref('all');
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
 * 切换导航视图
 */
function switchNav(key) {
  if (isDemoAccount.value && key === 'add') {
    message({ content: '演示账户仅可查看数据，不能新增内容', type: 'error' });
    return;
  }

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
  try {
    const res = await animeApi.getAdminList(type, page);
    animeList.value = res.data.content || [];
    totalPages.value = res.data.totalPages || 1;
    currentPage.value = res.data.number + 1;
  } catch (err) {
    message({ content: '数据加载失败', type: 'error' });
  }
}

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
  } catch (err) {
    message({ content: '数据获取失败', type: 'error' });
  }
}

/** 关闭编辑窗口 */
function closeEditModal() {
  showEditModal.value = false;
  editCoverFile = null;
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

  const isConfirm = await confirm({ content: '确定要删除这条记录吗？' });
  if (!isConfirm) return;

  try {
    await animeApi.deleteAnime(id);
    message({ content: '删除成功！', type: 'success' });
    loadList(currentView.value, currentPage.value);
  } catch (err) {
    message({ content: '删除失败', type: 'error' });
  }
}

onMounted(() => {
  loadList('all', 1);
});
</script>

<style scoped>
/* 基础布局 */
.spa-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #fff;
}

/* 侧边栏 */
.side-nav {
  padding: 20px 15px;
  width: 250px;
  background: #fff;
  border-right: 1px solid #f1f5f9;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.logo-centered-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-top: 25px;
  padding-bottom: 30px;
}

.logo-text {
  font-size: 20px;
  font-weight: 800;
  color: #4b88fa;
}

.logo-subtitle {
  font-size: 14px;
  color: #79a4f3;
  font-weight: 550;
  margin: 0;
  letter-spacing: 2px;
  text-align: center;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  color: #94a3b8;
  transition: 0.2s;
}

.nav-item i {
  margin-right: 12px;
  width: 20px;
  text-align: center;
  font-size: 18px;
  color: #2563eb;
}

.nav-item:hover {
  background-color: #f8fafc;
  color: #2563eb;
}

.nav-item.active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.nav-divider {
  height: 10px;
  border-bottom: 1px solid #f1f5f9;
  margin: 10px 0;
}

.nav-info {
  color: #4b88fa;
}

.nav-info h3 {
  font-size: 16px;
}

.nav-info span {
  font-size: 16px;
}

/* 主内容区 */
.main-viewport {
  flex: 1;
  display: flex;
  height: 100%;
  min-width: 0;
  position: relative;
  background: #fff;
}

.sub-view {
  display: block;
  width: 100%;
  height: 100%;
}

/* 返回主页按钮 */
.back-home-btn {
  position: absolute;
  top: 20px;
  right: 30px;
  z-index: 1000;
  background: #f1f5f9;
  color: #475569;
  border: none;
  padding: 12px 28px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-home-btn:hover {
  background: #e2e8f0;
  color: #2563eb;
}

.order-container {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #fff;
  background-image: radial-gradient(#f0f0f0 0.5px, transparent 0.5px);
  background-size: 24px 24px;
}

.results-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 40px 10px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

/* 表格 */
.table-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 0 40px;
}

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

.modern-table {
  text-align: left;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 10px;
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
  padding: 15px 20px;
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

.modern-table tbody tr:hover td:first-child { border-left-color: #2563eb; }
.modern-table tbody tr:hover td:last-child { border-right-color: #2563eb; }

.anime-cover-thumb {
  width: 80px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: block;
}

.title-cell { font-weight: 600; color: #1e293b; }
.date-cell { color: #64748b; }

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

.status-pill.favorite { background: #fce7f3; color: #db2777; margin-right: 5px; }
.status-pill.watching { background: #eff6ff; color: #2563eb; }
.status-pill.finished { background: #ecfdf5; color: #059669; }

/* 按钮 */
.btn-edit {
  background-color: #10b981;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
  margin-right: 5px;
  transition: background 0.2s;
}

.btn-edit:hover { background-color: #059669; }

.btn-delete {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-delete:hover { background-color: #dc2626; }

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

.hero-content { text-align: center; }

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

.sub-title { color: #6b7280; font-size: 16px; margin-bottom: 40px; }

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
  transition: 0.3s;
}

.modern-search-bar:focus-within {
  border-color: #2563eb;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.1);
}

.modern-search-bar i { color: #9ca3af; margin-right: 15px; font-size: 18px; }

.modern-search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  color: #1f2937;
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

.fade-down-enter-active, .fade-down-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-down-enter-from, .fade-down-leave-to {
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

/* 模态窗口 */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease;
}

.modal-backdrop.show { opacity: 1; visibility: visible; }

.custom-modal {
  background: #fff;
  width: 600px;
  max-width: 90%;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  transform: translateY(20px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-backdrop.show .custom-modal { transform: translateY(0); }

.modal-header {
  padding: 20px 30px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.modal-title { font-size: 18px; font-weight: 700; color: #1e293b; }
.modal-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }

.highlight { color: #2563eb; font-weight: 600; }

.btn-close {
  border: none;
  background: transparent;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  transition: 0.2s;
}

.btn-close:hover { color: #ef4444; transform: rotate(90deg); }

.modal-body { padding: 30px; max-height: 70vh; overflow-y: auto; }

.modal-footer {
  padding: 20px 30px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 表单 */
.form-group { margin-bottom: 20px; }
.form-label { display: block; margin-bottom: 8px; font-size: 14px; color: #475569; font-weight: 600; }

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  outline: none;
  transition: 0.2s;
  font-size: 14px;
  background: #fff;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-row { display: flex; gap: 20px; }
.flex-1 { flex: 1; }

.checkbox-row { display: flex; gap: 20px; align-items: center; padding: 10px 0; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #475569;
}

.checkbox-label input { transform: scale(1.2); }

.upload-trigger {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: 0.2s;
}

.upload-trigger:hover { border-color: #2563eb; background: #f8fafc; }

.upload-icon { font-size: 24px; color: #94a3b8; }
.upload-text { color: #64748b; font-size: 13px; margin-top: 5px; }

.preview-box img { max-height: 150px; border-radius: 8px; margin-top: 15px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }

.preview-img { display: block; max-height: 150px; border-radius: 8px; margin-top: 15px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }

/* 主要/次要按钮 */
.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 10px 30px;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  transition: 0.2s;
}

.btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: none;
  padding: 10px 25px;
  border-radius: 50px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover { background: #e2e8f0; }

/* 版本信息 */
.version-info {
  position: fixed;
  left: 20px;
  bottom: 20px;
  z-index: 1001;
  color: #333;
  font-size: 14px;
  opacity: 0.9;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);
}

/* 移动端适配设计 */
.mobile-only { display: none; }
.desktop-only { display: block; }

@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }
  
  .spa-layout {
    flex-direction: column;
    overflow: hidden;
  }

  .side-nav {
    display: none !important; /* 移动端完全隐藏桌面侧边栏 */
  }

  .main-viewport {
    flex-direction: column;
    width: 100vw;
  }

  /* 移动端顶栏 */
  .mobile-app-header {
    height: calc(80px + env(safe-area-inset-top)); /* 增加到 80px */
    padding: env(safe-area-inset-top) 15px 0;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
  }

  .mobile-back-btn {
    position: absolute;
    left: 15px;
    top: calc(50% + (env(safe-area-inset-top) / 2));
    transform: translateY(-50%);
    background: #f8fafc;
    border: none;
    width: 40px; /* 稍微放大返回按钮以匹配大 Header */
    height: 40px;
    border-radius: 50%;
    color: #2563eb;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  }

  .mobile-page-title {
    font-size: 23px; /* 字体稍微加大 */
    font-weight: 700;
    color: #1e293b;
  }

  /* 移动端底部导航栏入场/离场动画 (dock-slide) */
  .dock-slide-enter-active,
  .dock-slide-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .dock-slide-enter-from,
  .dock-slide-leave-to {
    transform: translateY(120%) scale(0.9);
    opacity: 0;
  }

  /* 移动端选项卡导航 (Dock 风格重构) */
  .mobile-tab-nav-wrapper {
    position: fixed;
    bottom: calc(20px + env(safe-area-inset-bottom));
    left: 15px;
    right: 15px;
    display: flex !important;
    justify-content: center;
    z-index: 2500;
    pointer-events: none; /* 关键：不拦截背景滑动 */
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* 折叠状态下的容器调整 */
  .mobile-tab-nav-wrapper.is-collapsed {
    justify-content: flex-start;
  }

  .dock-container-group {
    display: flex;
    gap: 8px;
    align-items: center;
    pointer-events: auto;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: right center;
  }

  .dock-container-group.hiding {
    transform: translateX(-100vw);
    opacity: 0;
    pointer-events: none;
  }

  .floating-dock {
    display: flex;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    padding: 8px;
    border-radius: 24px;
    gap: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.6);
    max-width: calc(100vw - 100px);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .floating-dock::-webkit-scrollbar { display: none; }

  /* 折叠按钮岛 & 展开按钮岛 */
  .collapse-island, .expand-trigger-island {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.6);
    cursor: pointer;
    pointer-events: auto;
    color: var(--sys-blue);
    font-size: 18px;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .collapse-island:active, .expand-trigger-island:active {
    transform: scale(0.9);
  }

  /* 展开按钮的特殊入场动画 */
  .expand-trigger-island {
    animation: island-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  @keyframes island-pop {
    from { transform: scale(0) rotate(-180deg); opacity: 0; }
    to { transform: scale(1) rotate(0); opacity: 1; }
  }

  .dock-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 12px;
    min-width: 60px;
    border-radius: 18px;
    gap: 4px;
    color: #64748b;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    cursor: pointer;
  }

  .dock-item i {
    font-size: 18px;
  }

  .dock-label {
    font-size: 10px;
    font-weight: 600;
  }

  .dock-item.active {
    background: #2563eb;
    color: #fff;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    transform: translateY(-2px);
  }
  
  .dock-item:active {
    transform: scale(0.92);
  }

  /* 卡片列表 */
  .mobile-card-list {
    display: flex !important;
    flex-direction: column;
    padding: 15px;
    padding-bottom: 120px !important; /* 必须给底部留出悬浮按钮的空间 */
    gap: 12px;
    flex: 1;
    overflow-y: auto;
  }

  .admin-mobile-card {
    background: #fff;
    border-radius: 16px;
    padding: 12px;
    display: flex;
    gap: 12px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    border: 1px solid #f8fafc;
  }

  .mobile-admin-thumb {
    width: 70px;
    height: 90px;
    object-fit: cover;
    border-radius: 10px;
  }

  .card-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .mobile-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .mobile-anime-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .mobile-status-tag { display: flex; gap: 4px; }
  .pill {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
  }
  .pill.fav { background: #fce7f3; color: #db2777; }
  .pill.watch { background: #eff6ff; color: #2563eb; }

  .mobile-card-info {
    font-size: 12px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .mobile-card-actions {
    display: flex;
    gap: 8px;
    margin-top: 5px;
  }

  .mobile-card-actions button {
    flex: 1;
    padding: 6px;
    border-radius: 8px;
    border: none;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    background: #f1f5f9;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .mobile-card-actions button.del { color: #ef4444; }

  .empty-mobile {
    text-align: center;
    padding: 50px 0;
    color: #94a3b8;
    font-size: 14px;
  }

  /* 添加新番页面适配 */
  .search-landing {
    padding: 40px 20px;
    padding-bottom: 150px !important; /* 增加底部留白 */
  }
  .main-title { font-size: 28px !important; }
  .sub-title { font-size: 14px !important; margin-bottom: 30px !important; }
  .search-container {
    width: 100% !important;
  }
  .modern-search-bar {
    width: 100% !important;
    padding: 5px 5px 5px 15px !important;
  }
  .modern-search-bar button { 
    padding: 10px 24px !important; 
    font-size: 14px !important; 
    white-space: nowrap !important;
    min-width: fit-content !important;
  }
  
  .search-results-dropdown {
    position: relative;
    box-shadow: none;
    border-radius: 12px;
    margin-top: 10px;
    border: 1px solid #e2e8f0;
  }
  
  .result-cover {
    width: 45px;
    height: 60px;
  }
  
  .result-title {
    font-size: 15px;
  }

  .result-desc {
    -webkit-line-clamp: 1;
  }
  
  .result-action {
    opacity: 1;
    background: transparent;
  }

  /* 模态框移动端适配 */
  .custom-modal {
    width: 100% !important;
    max-width: 100% !important;
    height: 90vh;
    border-radius: 20px 20px 0 0 !important;
    position: fixed;
    bottom: 0;
    transform: translateY(100%);
  }
  .modal-backdrop.show .custom-modal { transform: translateY(0); }
  .form-row { flex-direction: column; gap: 0; }
  
  .version-info { display: none !important; }
}
</style>
