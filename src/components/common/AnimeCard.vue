<template>
  <button
    ref="cardRef"
    type="button"
    class="anime-card"
    :aria-label="'查看 ' + anime.title"
    @click="handleClick"
  >
    <div ref="imgWrapperRef" class="card-image-wrapper">
      <img
        ref="imgRef"
        v-lazy-cover="coverUrl"
        :alt="anime.title"
        decoding="async"
        width="240"
        height="320"
      />
      <span v-if="anime.isFavorite" class="cover-favorite" title="最喜欢"
        ><i class="fa-solid fa-heart" aria-hidden="true"></i
      ></span>
      <span class="cover-episodes">{{ anime.totalEpisodes }} EP</span>
    </div>
    <div class="card-info">
      <div class="card-title" :title="anime.title">{{ anime.title }}</div>
      <div class="card-meta">
        <span>{{ anime.isWatching ? '正在追' : '已看完' }}</span><span>{{ finishYear }}</span>
      </div>
    </div>
  </button>
</template>

<script setup>
import { computed, ref } from 'vue';
import { getCoverImageUrl } from '@/utils/constants';
import { vLazyCover } from '@/utils/lazyCover';

const props = defineProps({ anime: { type: Object, required: true } });
const emit = defineEmits(['click']);
const cardRef = ref(null);
const imgWrapperRef = ref(null);
const imgRef = ref(null);
const coverUrl = computed(() => getCoverImageUrl(props.anime.coverImage));
const finishYear = computed(() => props.anime.finishDate?.split('-')[0] || '更新中');

function handleClick() {
  emit('click', {
    anime: props.anime,
    sourceRect: imgWrapperRef.value?.getBoundingClientRect(),
    sourceImg: imgRef.value
  });
}
</script>

<style scoped>
.anime-card {
  cursor: pointer;
  text-align: left;
  position: relative;
  border: 1px solid #e0e5eb;
  background: #fff;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  contain: layout paint style;
  transition: border-color 0.15s;
}
.anime-card:hover {
  border-color: #8fb6dc;
}
.card-image-wrapper {
  width: 100%;
  aspect-ratio: 3 / 4;
  position: relative;
  overflow: hidden;
  background: #edf0f4;
}
.card-image-wrapper img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  color: transparent;
}
.card-image-wrapper img:not([src]) {
  visibility: hidden;
}
.cover-favorite {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  background: #fffffff0;
  color: #d27486;
  border-radius: 50%;
  font-size: 10px;
}
.cover-episodes {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 3px 5px;
  background: #16283ecc;
  color: white;
  font-size: 8px;
  letter-spacing: 0.8px;
}
.card-info {
  padding: 11px 11px 10px;
  height: 65px;
  overflow: hidden;
}
.card-title {
  font-size: 12px;
  font-weight: 600;
  color: #354258;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}
.card-meta {
  font-size: 9px;
  color: #929cad;
  display: flex;
  justify-content: space-between;
  letter-spacing: 0.4px;
}
</style>
