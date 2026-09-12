<template>
  <aside class="sider" :class="{ collapsed: isCollapsed }">
    <!-- 移动端遮罩:点击关闭底部抽屉(置于被 transform 的面板之外,保证 fixed 定位生效) -->
    <div class="sider-backdrop" @click="closeSider" />

    <div class="sider-panel">
      <!-- 移动端抽屉把手 -->
      <div class="sheet-grabber" aria-hidden="true" />

      <slot />
    </div>
  </aside>
</template>

<script lang="ts" setup>
import { useSider } from '@/hooks'

const { isCollapsed, closeSider } = useSider()
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.sider {
  // 容器不参与位移,仅作定位锚点;事件穿透,由内部元素自行接收
  position: fixed;
  top: 0.9rem;
  right: 0.9rem;
  bottom: 0.9rem;
  z-index: 200;
  display: flex;
  width: calc(var.$layout-sider-width - 0.9rem);
  pointer-events: none;

  .sider-backdrop {
    display: none;
  }

  .sider-panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
    pointer-events: auto;
    background: var.$color-configurator;
    border: 1px solid var.$color-border-strong;
    border-radius: 1.4rem;
    box-shadow: 0 1.8rem 4rem rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(1.2rem);

    @supports not (backdrop-filter: blur(1.2rem)) {
      background: color.adjust(var.$color-dark, $lightness: -2%);
    }

    @media (prefers-reduced-motion: no-preference) {
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  &.collapsed .sider-panel {
    transform: translateX(calc(100% + 1.5rem));
  }

  .sheet-grabber {
    display: none;
  }

  // ---------- 移动端:底部抽屉 ----------
  @media screen and (max-width: var.$screen-lg) {
    top: auto;
    right: 0;
    bottom: 0;
    width: 100%;

    .sider-backdrop {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      display: block;
      background: rgba(0, 0, 0, 0.55);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s;

      @media (prefers-reduced-motion: no-preference) {
        backdrop-filter: blur(2px);
      }
    }

    &:not(.collapsed) .sider-backdrop {
      opacity: 1;
      pointer-events: auto;
    }

    .sider-panel {
      height: min(82vh, 42rem);
      border-right: 0;
      border-bottom: 0;
      border-radius: 1.4rem 1.4rem 0 0;
      box-shadow: 0 -1.2rem 3rem rgba(0, 0, 0, 0.5);
    }

    &.collapsed .sider-panel {
      transform: translateY(100%);
    }

    .sheet-grabber {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      height: 1.4rem;

      &::before {
        width: 2.6rem;
        height: 0.28rem;
        background: color.adjust(var.$color-text, $lightness: -25%);
        border-radius: 0.2rem;
        content: '';
      }
    }
  }
}
</style>
