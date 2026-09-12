<template>
  <header class="header">
    <Logo :size="2.4" />

    <h2 class="site-title">Color Avatar</h2>

    <div class="header-right">
      <button
        type="button"
        class="panel-toggle"
        :class="{ active: !isCollapsed }"
        :title="
          isCollapsed
            ? t('action.openConfigurator')
            : t('action.closeConfigurator')
        "
        :aria-expanded="!isCollapsed"
        @click="isCollapsed ? openSider() : closeSider()"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h13M20 18h0"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <circle cx="16" cy="6" r="2.2" fill="currentColor" />
          <circle cx="8" cy="12" r="2.2" fill="currentColor" />
          <circle cx="18.5" cy="18" r="2.2" fill="currentColor" />
        </svg>
        <span class="toggle-text">{{ t('action.customize') }}</span>
      </button>

      <a
        href="https://github.com/Codennnn/vue-color-avatar"
        target="_blank"
        rel="nofollow noopener noreferrer"
      >
        <button
          type="button"
          class="github-button"
          @click="
            recordEvent('click_github', {
              event_category: 'click',
            })
          "
        >
          <img :src="IconGitHub" alt="GitHub" />
          <span class="text">GitHub</span>
        </button>
      </a>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

import IconGitHub from '@/assets/icons/icon-github.svg'
import Logo from '@/components/Logo.vue'
import { useSider } from '@/hooks'
import { recordEvent } from '@/utils/ga'

const { t } = useI18n()
const { isCollapsed, openSider, closeSider } = useSider()
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: var.$layout-header-height;
  padding: 0 clamp(1rem, 3vw, 2rem);
  background: rgba(var.$color-page-bg, 0.72);
  border-bottom: 1px solid var.$color-border;
  backdrop-filter: blur(1rem);

  @supports not (backdrop-filter: blur(1rem)) {
    background: color.adjust(var.$color-page-bg, $lightness: 3%);
  }

  .site-title {
    margin-left: 0.9rem;
    font-weight: 700;
    font-size: 1.35rem;
    letter-spacing: 0.02em;
    background: linear-gradient(
      100deg,
      var.$color-text-strong,
      var.$color-secondary
    );
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    cursor: default;

    @media screen and (max-width: var.$screen-sm) {
      display: none;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-left: auto;
  }

  .panel-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    height: 2.4rem;
    padding: 0 0.9rem;
    color: var.$color-text;
    font: inherit;
    font-size: 0.92rem;
    font-weight: 600;
    background: color.adjust(var.$color-dark, $lightness: 8%);
    border: 1px solid var.$color-border-strong;
    border-radius: 2.4rem;
    cursor: pointer;
    transition: color 0.2s, background-color 0.2s, border-color 0.2s;
    user-select: none;

    svg {
      width: 1.1rem;
      height: 1.1rem;
    }

    &:hover,
    &:focus-visible {
      color: var.$color-text-strong;
      border-color: rgba(var.$color-accent, 0.55);
      outline: none;
    }

    &.active {
      color: #fff;
      background: linear-gradient(
        115deg,
        var.$color-primary,
        var.$color-secondary
      );
      border-color: transparent;
    }
  }

  .github-button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2.4rem;
    padding: 0 0.9rem;
    overflow: hidden;
    color: var.$color-text;
    font-weight: 600;
    font-size: 0.92rem;
    background: color.adjust(var.$color-dark, $lightness: 4%);
    border: 1px solid var.$color-border;
    border-radius: 2.4rem;
    cursor: pointer;
    transition: color 0.2s, border-color 0.2s;
    user-select: none;

    &:hover,
    &:focus-visible {
      color: var.$color-text-strong;
      border-color: var.$color-border-strong;
    }

    .text {
      margin-left: 0.45rem;
      letter-spacing: 0.02em;
    }
  }

  @media screen and (max-width: var.$screen-sm) {
    .toggle-text {
      display: none;
    }

    .panel-toggle {
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border-radius: 50%;
    }

    .github-button {
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border-radius: 50%;

      .text {
        display: none;
      }
    }
  }
}
</style>
