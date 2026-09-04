<template>
  <ModalWrapper :visible="props.visible" @close="emit('close')">
    <div class="code-box">
      <div class="code-header">
        <div class="title">{{ t('text.codeModalTitle') }}</div>

        <div class="close-btn" @click="emit('close')">
          <img :src="IconClose" class="icon-close" :alt="t('action.close')" />
        </div>
      </div>

      <div class="code-content-box">
        <PerfectScrollbar
          class="code-scroll-wrapper"
          :options="{ suppressScrollX: false }"
        >
          <pre><code class="code-content" v-html="highlightedCode"></code></pre>
        </PerfectScrollbar>

        <button
          id="copy-code-btn"
          class="copy-btn"
          :class="{ copied: copied }"
          :data-clipboard-text="codeJSON"
        >
          {{ copied ? t('action.copied') : t('action.copyCode') }}
        </button>
      </div>
    </div>
  </ModalWrapper>
</template>

<script lang="ts" setup>
import type ClipboardJS from 'clipboard'
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import IconClose from '@/assets/icons/icon-close.svg'
import PerfectScrollbar from '@/components/PerfectScrollbar.vue'
import { useAvatarOption } from '@/hooks'
import { highlightJSON } from '@/utils'

import ModalWrapper from './ModalWrapper.vue'

const props = defineProps<{ visible?: boolean }>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()

const [avatarOption] = useAvatarOption()

// 配置代码中剔除图片底图的 base64 数据，避免内容过大
const codeJSON = computed(() =>
  JSON.stringify(
    avatarOption.value,
    (key, value) => (key === 'image' ? undefined : value),
    4
  )
)

const highlightedCode = ref('')

watchEffect(() => {
  if (codeJSON.value) {
    highlightedCode.value = highlightJSON(codeJSON.value)
  }
})

const copied = ref(false)

let clipboard: ClipboardJS

onMounted(async () => {
  const { default: ClipboardJS } = await import('clipboard')
  clipboard = new ClipboardJS('#copy-code-btn')

  clipboard.on('success', (e) => {
    copied.value = true

    setTimeout(() => {
      copied.value = false
    }, 800)

    e.clearSelection()
  })
})

onUnmounted(() => {
  clipboard.destroy()
})
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.code-box {
  $code-header-height: 3.8rem;
  $code-box-side-padding-normal: 1.6rem;
  $code-box-side-padding-small: 1rem;
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  width: 75%;
  max-width: 800px;
  height: min(90vh, 1000px);
  margin: 0 auto;
  padding: 0 0 1.6rem;
  overflow: hidden;
  background-color: color.adjust(var.$color-dark, $lightness: 3%);
  border: 1px solid var.$color-border-strong;
  border-radius: 1.4rem;
  box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.2s;

  @media screen and (max-width: 1200px) {
    width: 75%;
  }

  @media screen and (max-width: var.$screen-md) {
    width: 86%;
  }

  @media screen and (max-width: var.$screen-sm) {
    width: 92%;

    .code-header {
      padding: 0 $code-box-side-padding-small;
    }
  }

  .code-header {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    width: 100%;
    height: $code-header-height;
    padding: 0 $code-box-side-padding-normal;

    .title {
      color: var.$color-text-strong;
      font-weight: 600;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.1rem;
      height: 2.1rem;
      margin-left: auto;
      background-color: color.adjust(var.$color-dark, $lightness: 9%);
      border: 1px solid transparent;
      border-radius: 50%;
      cursor: pointer;
      transition: border-color 0.2s;

      .icon-close {
        width: 45%;
        opacity: 0.6;
        transition: opacity 0.2s;
      }

      &:hover {
        border-color: var.$color-border-strong;

        .icon-close {
          opacity: 1;
        }
      }
    }
  }

  .code-content-box {
    position: relative;
    flex: 1;
    min-height: 0;
    margin: 0 $code-box-side-padding-normal;
    padding: 1rem 0 3.2rem;
    overflow: hidden;
    background: color.adjust(var.$color-dark, $lightness: -1%);
    border: 1px solid var.$color-border;
    border-radius: 0.9rem;

    @media screen and (max-width: var.$screen-sm) {
      margin: 0 $code-box-side-padding-small;
    }

    .code-scroll-wrapper {
      height: 100%;
    }

    .copy-btn {
      position: absolute;
      bottom: 0.9rem;
      left: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 5.4rem;
      height: 2.1rem;
      color: #fff;
      background: linear-gradient(
        115deg,
        var.$color-primary,
        var.$color-secondary
      );
      border-radius: 2.1rem;
      box-shadow: 0 0.4rem 1.2rem rgba(var.$color-accent, 0.35);
      transform: translateX(-50%);
      cursor: pointer;
      transition: filter 0.15s, box-shadow 0.2s;

      &:hover {
        box-shadow: 0 0.5rem 1.5rem rgba(var.$color-accent, 0.5);
      }

      &.copied {
        color: var.$color-dark;
        background-color: var.$color-secondary;
        box-shadow: none;
      }
    }
  }
}
</style>

<style lang="scss">
@use 'src/styles/var';
@use 'sass:color';

.code-content {
  display: block;
  padding: 0 1.5rem;
  color: #81cfef;
  font-size: 1.05rem;
  font-family: 'Ubuntu Mono', Fallback;
  line-height: 1.5;

  @media screen and (max-width: var.$screen-sm) {
    padding: 0 1rem;
    font-size: 0.9rem;
  }

  & > .token {
    &.key {
      color: #c792ea;
    }

    &.string,
    &.number {
      color: #c3e88d;
    }
  }
}
</style>
