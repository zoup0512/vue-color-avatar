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
          :title="
            store.generatedImagePrompts[image] || t('label.aiGeneratedImage')
          "
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
  // 同步删除服务器端保存的历史；失败时仅清空本地列表
  await clearGeneratedImageHistory()
  store[CLEAR_GENERATED_IMAGES]()
}
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.generated-images-panel {
  position: absolute;
  top: 0;
  right: 1rem;
  bottom: 0;
  display: flex;
  flex-direction: column;
  row-gap: 0.5rem;
  width: 5.5rem;
  padding: 0.6rem;
  background: color.adjust(var.$color-dark, $lightness: 5%);
  border-radius: 0.6rem;
  box-shadow: 0 0.4rem 1.2rem rgba(0, 0, 0, 0.35);

  .panel-header {
    text-align: center;

    .panel-title {
      font-size: 0.78rem;
      font-weight: bold;
      white-space: nowrap;
    }
  }

  .clear-btn {
    flex-shrink: 0;
    padding: 0.25rem 0;
    color: color.adjust(var.$color-text, $lightness: -10%);
    font: inherit;
    font-size: 0.7rem;
    white-space: nowrap;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 0.3rem;

    &:hover,
    &:focus-visible {
      color: var.$color-text;
      background: color.adjust(var.$color-dark, $lightness: 12%);
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
      background: color.adjust(var.$color-dark, $lightness: 20%);
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
      border-radius: 0.45rem;
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
        border-color: color.adjust(var.$color-text, $lightness: -20%);
      }
    }
  }
}

@media screen and (max-width: var.$screen-sm) {
  .generated-images-panel {
    display: none;
  }
}
</style>
