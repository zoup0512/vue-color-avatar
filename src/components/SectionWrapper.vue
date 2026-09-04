<template>
  <div class="setting-section">
    <div class="section-title">{{ props.title }}</div>
    <div>
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  title?: string
}>()
</script>

<style lang="scss" scoped>
@use 'src/styles/var';

.setting-section {
  padding: 1.4rem 1.1rem;

  & + .setting-section {
    border-top: 1px solid var.$color-border;
  }

  .section-title {
    display: flex;
    align-items: center;
    margin-bottom: 1.1rem;
    color: var.$color-text-strong;
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 23px;

    &::before {
      width: 0.28rem;
      height: 0.95rem;
      margin-right: 0.55rem;
      background: linear-gradient(
        180deg,
        var.$color-primary,
        var.$color-secondary
      );
      border-radius: 0.2rem;
      content: '';
    }
  }
}
</style>
