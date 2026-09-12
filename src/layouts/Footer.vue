<template>
  <footer class="footer">
    <div
      data-message="If you are deploying to your own public website, please do not modify it unless you have permission from the original author."
    >
      Made by
      <a
        class="link"
        href="https://leoku.top"
        target="_blank"
        rel="nofollow noopener noreferrer"
      >
        LeoKu
      </a>
    </div>

    <div class="divider">·</div>

    <button type="button" class="locale" @click="switchLocale">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          stroke-width="1.6"
        />
        <path
          d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"
          stroke="currentColor"
          stroke-width="1.6"
        />
      </svg>
      {{ locale === Locale.EN ? '简体中文' : 'English' }}
    </button>
  </footer>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import { Locale } from '@/enums'

const { locale } = useI18n()

function switchLocale() {
  locale.value = locale.value === Locale.EN ? Locale.ZH : Locale.EN
}
</script>

<style lang="scss" scoped>
@use 'src/styles/var';

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var.$layout-footer-height;
  padding: 0.6rem 0;
  color: rgba(var.$color-text, 0.45);
  font-weight: 500;
  font-size: 0.8rem;

  .divider {
    padding: 0 0.8rem;
  }

  .locale {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.6rem;
    color: inherit;
    font: inherit;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 2rem;
    transition: color 0.2s, border-color 0.2s;

    svg {
      width: 0.95rem;
      height: 0.95rem;
      opacity: 0.7;
    }

    &:hover,
    &:focus-visible {
      color: var.$color-text;
      border-color: var.$color-border-strong;
      outline: none;
    }
  }

  .link {
    transition: color 0.2s;

    &:hover {
      color: var.$color-text;
    }
  }
}
</style>
