<template>
  <aside
    v-if="store.editorMode === 'ai' && store.generatedImages.length > 0"
    class="generated-images-panel"
    :aria-label="t('label.aiGeneratedImages')"
  >
    <div class="panel-header">
      <span class="panel-title">{{ t('label.aiGeneratedImages') }}</span>
    </div>

    <ul class="image-list">
      <li
        v-for="(image, index) in reversedImages"
        :key="image"
        class="image-item"
      >
        <button
          type="button"
          class="image-btn"
          :class="{ active: image === store.generatedImage }"
          :aria-pressed="image === store.generatedImage"
          :aria-label="`
            ${t('label.aiGeneratedImage')} ${reversedImages.length - index}
          `"
          @click="handleSelect(image)"
        >
          <img :src="image" :alt="t('label.aiGeneratedImage')" loading="lazy" />
        </button>
      </li>
    </ul>

    <button
      type="button"
      class="clear-btn"
      :title="t('action.clearGeneratedImages')"
      @click="handleClear"
    >
      {{ t('action.clearGeneratedImages') }}
    </button>
  </aside>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { clearGeneratedImageHistory } from '@/services/ai-image'
import { useStore } from '@/store'
import {
  CLEAR_GENERATED_IMAGES,
  SET_CURRENT_GENERATED_IMAGE,
} from '@/store/mutation-type'

const { t } = useI18n()
const store = useStore()

const reversedImages = computed(() => [...store.generatedImages].reverse())

function handleSelect(image: string) {
  store[SET_CURRENT_GENERATED_IMAGE](image)
}

async function handleClear() {
  // 同步删除服务器端保存的历史;失败时仅清空本地列表
  await clearGeneratedImageHistory()
  store[CLEAR_GENERATED_IMAGES]()
}
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

// 桌面端:舞台右侧竖排玻璃卡片
.generated-images-panel {
  position: absolute;
  top: 50%;
  right: max(1rem, calc(50% - 22rem));
  display: flex;
  flex-direction: column;
  row-gap: 0.5rem;
  width: 5.5rem;
  max-height: 80%;
  padding: 0.7rem 0.6rem;
  background: rgba(var.$color-dark, 0.6);
  border: 1px solid var.$color-border-strong;
  border-radius: 0.9rem;
  box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(0.8rem);
  transform: translateY(-50%);

  .panel-header {
    flex-shrink: 0;
    text-align: center;

    .panel-title {
      font-size: 0.74rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
  }

  .clear-btn {
    flex-shrink: 0;
    padding: 0.25rem 0;
    color: var.$color-text-muted;
    font: inherit;
    font-size: 0.68rem;
    white-space: nowrap;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 0.4rem;

    &:hover,
    &:focus-visible {
      color: #ff8794;
      background: color.adjust(var.$color-dark, $lightness: 10%);
      outline: none;
    }
  }

  .image-list {
    display: flex;
    flex: 1;
    flex-direction: column;
    row-gap: 0.5rem;
    min-height: 0;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: color.adjust(var.$color-dark, $lightness: 22%);
      border-radius: 2px;
    }

    .image-item {
      flex-shrink: 0;
    }

    .image-btn {
      width: 100%;
      padding: 0;
      overflow: hidden;
      cursor: pointer;
      background: transparent;
      border: 2px solid transparent;
      border-radius: 0.5rem;
      outline: none;

      img {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
      }

      &.active {
        border-color: var.$color-primary;
      }

      &:hover:not(.active),
      &:focus-visible {
        border-color: rgba(var.$color-text, 0.4);
      }
    }
  }
}

// 移动端:舞台下方横向滑动条
@media screen and (max-width: var.$screen-lg) {
  .generated-images-panel {
    position: static;
    flex-direction: row;
    align-items: center;
    width: 100%;
    max-width: 26rem;
    max-height: none;
    margin-top: 1.1rem;
    padding: 0.55rem 0.65rem;
    border-radius: 1rem;
    transform: none;

    .panel-header {
      display: none;
    }

    .image-list {
      flex-direction: row;
      column-gap: 0.5rem;
      overflow-y: hidden;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      .image-btn {
        width: 3.4rem;
        flex-shrink: 0;
      }
    }

    .clear-btn {
      flex-shrink: 0;
      margin-left: 0.5rem;
      padding: 0.4rem 0.55rem;
      font-size: 0.72rem;
    }
  }
}
</style>
