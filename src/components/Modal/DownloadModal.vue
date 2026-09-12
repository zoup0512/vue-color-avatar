<template>
  <Teleport to="body">
    <div
      v-if="props.visible"
      class="download-modal-wrapper"
      @click="emit('close')"
    >
      <div class="download-modal" @click.stop>
        <div class="modal-body">
          <div class="avatar-preview">
            <img
              alt="vue-color-avatar"
              :src="props.imageUrl"
              class="avatar-img"
            />
          </div>

          <p class="tip">{{ t('text.downloadTip') }} 🥳</p>
        </div>

        <button type="button" class="close-btn" @click="emit('close')">
          {{ t('action.close') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

const props = defineProps<{ visible?: boolean; imageUrl: string }>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { t } = useI18n()
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.download-modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 1.5rem;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(0.4rem);

  @supports not (backdrop-filter: blur(0.4rem)) {
    background: rgba(0, 0, 0, 0.72);
  }
}

.download-modal {
  position: relative;
  width: 50%;
  min-width: 310px;
  max-width: 500px;
  overflow: hidden;
  background: color.adjust(var.$color-dark, $lightness: 3%);
  border: 1px solid var.$color-border-strong;
  border-radius: 1.4rem;
  box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.5);

  .modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem 1.4rem 1.4rem;

    .avatar-preview {
      width: 60%;
      margin: 0 auto;
      background: rgba(var.$color-page-bg, 0.5);
      border-radius: 1rem;

      @media screen and (max-width: var.$screen-md) {
        width: 80%;
      }

      @media screen and (max-width: var.$screen-sm) {
        width: 90%;
      }

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .tip {
      max-width: 70%;
      margin: 0 auto;
      padding: 1.4rem 0 0.4rem;
      color: var.$color-text;
      font-size: 0.85rem;
      text-align: center;
      cursor: default;
    }
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 3rem;
    color: var.$color-text;
    font-weight: 600;
    background: rgba(var.$color-dark, 0.4);
    border-top: 1px solid var.$color-border;
    cursor: pointer;
    transition: color 0.2s, background-color 0.2s;
    user-select: none;

    &:hover {
      color: var.$color-text-strong;
      background: color.adjust(var.$color-dark, $lightness: 8%);
    }
  }
}
</style>
