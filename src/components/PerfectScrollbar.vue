<template>
  <div ref="scrollWrapper" style="position: relative; overflow: hidden">
    <slot />
  </div>
</template>

<script lang="ts">
export interface PerfectScrollbarRef {
  update: (resetScroll?: boolean) => void
}
</script>

<script lang="ts" setup>
import PerfectScrollbar from 'perfect-scrollbar'
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ options?: PerfectScrollbar.Options }>()

const scrollWrapper = ref<HTMLDivElement>()

let ps: PerfectScrollbar | undefined

function update(resetScroll = false) {
  if (resetScroll && scrollWrapper.value) {
    scrollWrapper.value.scrollTop = 0
  }
  ps?.update()
}

defineExpose<PerfectScrollbarRef>({ update })

onMounted(() => {
  if (!scrollWrapper.value) {
    console.warn(`No valid 'PerfectScrollbar' container found`)
    return
  }

  ps = new PerfectScrollbar(scrollWrapper.value, {
    minScrollbarLength: 20,
    maxScrollbarLength: 160,
    ...props.options,
  })
})

onUnmounted(() => {
  ps?.destroy()
})
</script>

<style lang="scss">
.ps--active-y .ps__rail-y {
  &:hover,
  &.ps--clicking {
    background-color: #2c323a;
  }
}
</style>
