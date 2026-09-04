<template>
  <ModalWrapper :visible="props.visible" @close="emit('close')">
    <div class="container">
      <div class="header">
        <div class="title">{{ t('label.batchGenerateTitle') }}</div>
        <button type="button" class="close-btn" @click="emit('close')">
          ×
        </button>
      </div>

      <div class="tip">
        {{ t('text.batchGenerateTip', { gender: genderLabel }) }}
      </div>

      <div class="toolbar">
        <span class="select-label">{{ t('label.batchTemplateSelect') }}</span>
        <button
          type="button"
          class="link-btn"
          :disabled="running"
          @click="toggleSelectAll"
        >
          {{ t('action.selectAll') }}
        </button>
      </div>

      <div class="template-list">
        <label
          v-for="template in props.templates"
          :key="template.id"
          class="template-item"
          :class="{
            selected: selectedIds.includes(template.id),
            disabled:
              running || !getPrompt(template.id) || !props.referenceImage,
          }"
        >
          <input
            type="checkbox"
            :checked="selectedIds.includes(template.id)"
            :disabled="
              running || !getPrompt(template.id) || !props.referenceImage
            "
            :title="getPrompt(template.id) ? '' : t('text.batchEmptyPrompt')"
            @change="toggleTemplate(template.id)"
          />
          <span class="template-name">{{ template.name }}</span>
          <span
            v-if="statuses[template.id]"
            class="status"
            :class="statuses[template.id]"
          >
            {{ t(`text.batchStatus${cap(statuses[template.id])}`) }}
          </span>
        </label>
      </div>

      <p v-if="hintText" class="hint">{{ hintText }}</p>

      <div class="footer">
        <button v-if="running" type="button" class="btn stop-btn" @click="stop">
          {{ t('action.stopBatchGenerate') }}
        </button>
        <button
          v-else
          type="button"
          class="btn start-btn"
          :disabled="!props.referenceImage || selectedIds.length === 0"
          @click="start"
        >
          {{ t('action.startBatchGenerate') }}
        </button>
        <button type="button" class="btn close-text-btn" @click="emit('close')">
          {{ t('action.close') }}
        </button>
      </div>
    </div>
  </ModalWrapper>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ModalWrapper from '@/components/Modal/ModalWrapper.vue'
import { type AITemplateOption, generateAIImage } from '@/services/ai-image'

type BatchStatus = 'pending' | 'running' | 'done' | 'failed'

const props = defineProps<{
  visible?: boolean
  templates?: AITemplateOption[]
  prompts?: Record<string, string>
  referenceImage?: string
  genderLabel?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'generated', image: string): void
  (e: 'update:running', value: boolean): void
  (e: 'progress', progress: { current: number; total: number }): void
}>()

const { t } = useI18n()

const selectedIds = ref<string[]>([])
const statuses = reactive<Record<string, BatchStatus>>({})
const running = ref(false)
const stopRequested = ref(false)
const totalCount = ref(0)
const successCount = ref(0)
const failureCount = ref(0)
const stopped = ref(false)
const nothingSelectedHintShown = ref(false)

const processedCount = computed(() => successCount.value + failureCount.value)

const hintText = computed(() => {
  if (running.value) {
    return t('text.batchProgress', {
      current: processedCount.value + (statusesPendingCurrent() ? 1 : 0),
      total: totalCount.value,
      success: successCount.value,
      failure: failureCount.value,
    })
  }
  if (stopped.value) {
    return t('text.batchStopped')
  }
  if (totalCount.value > 0) {
    return t('text.batchProgress', {
      current: totalCount.value,
      total: totalCount.value,
      success: successCount.value,
      failure: failureCount.value,
    })
  }
  if (nothingSelectedHintShown.value) {
    return t('text.batchSelectRequired')
  }
  return ''
})

function statusesPendingCurrent() {
  return Object.values(statuses).includes('running')
}

function getPrompt(templateId: string) {
  return (props.prompts?.[templateId] ?? '').trim()
}

function cap(status: BatchStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function toggleTemplate(templateId: string) {
  const index = selectedIds.value.indexOf(templateId)
  if (index >= 0) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(templateId)
  }
}

function toggleSelectAll() {
  const selectableIds = (props.templates ?? [])
    .filter((template) => getPrompt(template.id) && props.referenceImage)
    .map((template) => template.id)

  if (selectedIds.value.length >= selectableIds.length) {
    selectedIds.value = []
  } else {
    selectedIds.value = selectableIds
  }
}

function stop() {
  if (running.value) {
    stopRequested.value = true
  }
}

function emitProgress() {
  emit('progress', {
    current: successCount.value + failureCount.value,
    total: totalCount.value,
  })
}

async function start() {
  const queue = selectedIds.value.filter((id) => getPrompt(id))
  if (queue.length === 0 || running.value || !props.referenceImage) {
    nothingSelectedHintShown.value = queue.length === 0
    return
  }

  nothingSelectedHintShown.value = false
  running.value = true
  stopRequested.value = false
  stopped.value = false
  totalCount.value = queue.length
  successCount.value = 0
  failureCount.value = 0
  for (const templateId of Object.keys(statuses)) {
    delete statuses[templateId]
  }
  queue.forEach((templateId) => {
    statuses[templateId] = 'pending'
  })
  emit('update:running', true)
  emitProgress()

  for (const templateId of queue) {
    if (stopRequested.value) {
      stopped.value = true
      break
    }

    statuses[templateId] = 'running'
    try {
      const image = await generateAIImage(
        props.referenceImage,
        getPrompt(templateId)
      )
      emit('generated', image)
      successCount.value += 1
      statuses[templateId] = 'done'
    } catch {
      // 单个模板失败不中断批量任务，失败信息通过每项状态与汇总展示
      failureCount.value += 1
      statuses[templateId] = 'failed'
    }
    emitProgress()
  }

  running.value = false
  emit('update:running', false)
  emitProgress()
}

watch(
  () => props.visible,
  (visible) => {
    // 关闭弹窗不清空状态，生成循环在后台继续，重新打开可查看进度
    if (visible) {
      nothingSelectedHintShown.value = false
    }
  }
)
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.container {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  width: min(92vw, 34rem);
  max-height: 86vh;
  overflow: hidden;
  background-color: color.adjust(var.$color-dark, $lightness: 3%);
  border: 1px solid var.$color-border-strong;
  border-radius: 1.4rem;
  box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.4rem 0.5rem;

    .title {
      color: var.$color-text-strong;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.9rem;
      height: 1.9rem;
      color: var.$color-text;
      font-size: 1.3rem;
      line-height: 1;
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 0.5rem;

      &:hover {
        background: color.adjust(var.$color-dark, $lightness: 12%);
        border-color: var.$color-border-strong;
      }
    }
  }

  .tip {
    padding: 0 1.4rem 0.6rem;
    color: var.$color-text-muted;
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .toolbar {
    display: flex;
    align-items: center;
    padding: 0 1.4rem 0.4rem;

    .select-label {
      margin-right: 0.8rem;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .link-btn {
      padding: 0.15rem 0.55rem;
      color: var.$color-secondary;
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
      background: transparent;
      border: 1px solid rgba(var.$color-secondary, 0.35);
      border-radius: 2rem;

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
  }

  .template-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.2rem 1.4rem;
    overflow-y: auto;

    .template-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.65rem;
      cursor: pointer;
      background: rgba(var.$color-dark, 0.5);
      border: 1px solid transparent;
      border-radius: 0.65rem;
      transition: border-color 0.2s;

      &.selected {
        border-color: rgba(var.$color-accent, 0.65);
      }

      &.disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      input[type='checkbox'] {
        accent-color: var.$color-primary;
      }

      .template-name {
        flex: 1;
        overflow: hidden;
        font-size: 0.9rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .status {
        flex-shrink: 0;
        padding: 0.12rem 0.55rem;
        font-size: 0.72rem;
        border-radius: 0.75rem;

        &.pending {
          color: var.$color-text-muted;
          background: color.adjust(var.$color-dark, $lightness: 12%);
        }

        &.running {
          color: #fff;
          background: var.$color-primary;
        }

        &.done {
          color: #06301f;
          background: #3ecf8e;
        }

        &.failed {
          color: #fff;
          background: #e5484d;
        }
      }
    }
  }

  .hint {
    min-height: 1.2rem;
    margin: 0.4rem 1.4rem 0;
    color: var.$color-text-muted;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem;
    padding: 0.8rem 1.4rem 1.2rem;

    .btn {
      padding: 0.6rem 1.2rem;
      color: var.$color-text;
      font: inherit;
      font-size: 0.9rem;
      cursor: pointer;
      background: rgba(var.$color-dark, 0.55);
      border: 1px solid var.$color-border-strong;
      border-radius: 2.2rem;
      transition: border-color 0.2s;

      &:hover:not(:disabled) {
        border-color: rgba(var.$color-accent, 0.5);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      &.start-btn {
        color: #fff;
        background: linear-gradient(
          115deg,
          var.$color-primary,
          var.$color-secondary
        );
        border-color: transparent;
        box-shadow: 0 0.35rem 1rem rgba(var.$color-accent, 0.3);
      }

      &.stop-btn {
        color: #fff;
        background: #e5484d;
        border-color: transparent;
      }
    }
  }
}
</style>
