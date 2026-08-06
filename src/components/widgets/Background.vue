<template>
  <div class="avatar-background" :style="backgroundStyle"></div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { type AvatarOption } from '../../types'

interface BackgroundProps {
  color: AvatarOption['background']['color']
  image?: AvatarOption['background']['image']
}

const props = defineProps<BackgroundProps>()

const backgroundStyle = computed(() => ({
  // 设置了图片底图时彻底替换默认背景色，不再显示颜色层
  background: props.image ? 'transparent' : props.color,
  backgroundImage: props.image ? `url("${props.image}")` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}))
</script>

<style lang="scss" scoped>
.avatar-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: background-color 0.1s;
}
</style>
