<template>
  <nav class="action-menu" aria-label="avatar actions">
    <button
      v-for="ac in actions"
      :key="ac.type"
      type="button"
      class="menu-item"
      :class="{ disabled: ac.disabled }"
      :title="ac.tip"
      :aria-label="ac.tip"
      @click="!ac.disabled && emit('action', ac.type)"
    >
      <img :src="ac.icon" :alt="ac.tip" />
    </button>
  </nav>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import IconBack from '@/assets/icons/icon-back.svg'
import IconCode from '@/assets/icons/icon-code.svg'
import IconFlip from '@/assets/icons/icon-flip.svg'
import IconNext from '@/assets/icons/icon-next.svg'
import { ActionType } from '@/enums'
import { useStore } from '@/store'

const emit = defineEmits<{
  (e: 'action', actionType: ActionType): void
}>()

const { t } = useI18n()

const store = useStore()

const canUndo = computed(() =>
  store.editorMode === 'ai'
    ? store.generatedImages.indexOf(store.generatedImage) > 0
    : store.history.past.length > 0
)
const canRedo = computed(() =>
  store.editorMode === 'ai'
    ? store.generatedImageRedoStack.length > 0
    : store.history.future.length > 0
)

const actions = computed(() => [
  {
    type: ActionType.Undo,
    icon: IconBack,
    tip: t('action.undo'),
    disabled: !canUndo.value,
  },
  {
    type: ActionType.Redo,
    icon: IconNext,
    tip: t('action.redo'),
    disabled: !canRedo.value,
  },
  {
    type: ActionType.Flip,
    icon: IconFlip,
    tip: t('action.flip'),
  },
  {
    type: ActionType.Code,
    icon: IconCode,
    tip: t('action.code'),
  },
])
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.action-menu {
  display: flex;
  align-items: center;
  margin-top: 1.4rem;
  padding: 0.4rem;
  column-gap: 0.3rem;
  background: rgba(var.$color-dark, 0.6);
  border: 1px solid var.$color-border-strong;
  border-radius: 2.6rem;
  backdrop-filter: blur(0.8rem);

  @supports not (backdrop-filter: blur(0.8rem)) {
    background: color.adjust(var.$color-dark, $lightness: 4%);
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.15s;

    img {
      width: 1.15rem;
      height: 1.15rem;
      opacity: 0.85;
      transition: opacity 0.2s;
    }

    &:hover:not(.disabled) {
      background: color.adjust(var.$color-dark, $lightness: 10%);

      img {
        opacity: 1;
      }
    }

    &:active:not(.disabled) {
      transform: scale(0.92);
    }

    &.disabled {
      cursor: default;

      img {
        opacity: 0.35;
      }
    }
  }
}
</style>
