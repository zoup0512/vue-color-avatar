<template>
  <SectionWrapper :title="t('label.aiImageGeneration')">
    <div class="ai-generator">
      <input
        ref="fileInputRef"
        type="file"
        class="file-input"
        accept="image/*"
        @change="handleSelectImage"
      />

      <button
        type="button"
        class="ai-btn"
        :disabled="generating"
        @click="fileInputRef?.click()"
      >
        {{
          referenceImage
            ? t('action.replaceReferenceImage')
            : t('action.uploadReferenceImage')
        }}
      </button>

      <template v-if="referenceImage">
        <img
          :src="referenceImage"
          class="reference-image"
          :alt="t('label.referenceImage')"
        />
        <button
          type="button"
          class="ai-btn secondary"
          :disabled="generating"
          @click="removeImage"
        >
          {{ t('action.removeReferenceImage') }}
        </button>
      </template>

      <div class="ai-option-group">
        <div class="ai-option-label">{{ t('label.aiGender') }}</div>
        <div
          class="ai-option-list"
          role="group"
          :aria-label="t('label.aiGender')"
        >
          <button
            v-for="gender in AI_GENDERS"
            :key="gender"
            type="button"
            class="ai-option-btn"
            :class="{ active: selectedGender === gender }"
            :aria-pressed="selectedGender === gender"
            :disabled="generating"
            @click="selectedGender = gender"
          >
            {{ t(`gender.${gender}`) }}
          </button>
        </div>
      </div>

      <div class="ai-option-group">
        <div class="ai-option-label">{{ t('label.aiPromptTemplate') }}</div>
        <div
          class="ai-option-list"
          role="group"
          :aria-label="t('label.aiPromptTemplate')"
        >
          <button
            v-for="templateId in AI_PROMPT_TEMPLATE_IDS"
            :key="templateId"
            type="button"
            class="ai-option-btn"
            :class="{ active: selectedTemplateId === templateId }"
            :aria-pressed="selectedTemplateId === templateId"
            :disabled="generating"
            @click="selectedTemplateId = templateId"
          >
            {{ t(`aiPromptTemplate.${templateId}`) }}
          </button>
        </div>
      </div>

      <label class="prompt-label" for="ai-image-prompt">
        {{ t('label.aiPrompt') }}
      </label>
      <textarea
        id="ai-image-prompt"
        v-model="prompt"
        class="prompt-input"
        rows="8"
        :maxlength="MAX_AI_PROMPT_LENGTH"
        :disabled="generating"
        :placeholder="t('text.aiPromptPlaceholder')"
      />
      <div class="prompt-count">
        {{
          t('text.aiPromptCount', {
            current: prompt.length,
            max: MAX_AI_PROMPT_LENGTH,
          })
        }}
      </div>

      <p v-if="errorText" class="error-text">{{ errorText }}</p>

      <button
        type="button"
        class="ai-btn primary"
        :disabled="generating || !referenceImage || !prompt.trim()"
        @click="handleGenerate"
      >
        {{
          generating
            ? t('action.generatingAIImage')
            : generatedImage
            ? t('action.regenerateAIImage')
            : t('action.generateAIImage')
        }}
      </button>
    </div>
  </SectionWrapper>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import SectionWrapper from '@/components/SectionWrapper.vue'
import {
  type AIGender,
  type AIPromptTemplateId,
  AI_GENDERS,
  AI_PROMPT_TEMPLATE_IDS,
  AIImageError,
  createAIPromptDrafts,
  DEFAULT_AI_GENDER,
  DEFAULT_AI_TEMPLATE_ID,
  generateAIImage,
  MAX_AI_PROMPT_LENGTH,
  prepareReferenceImage,
} from '@/services/ai-image'
import { useStore } from '@/store'
import { SET_GENERATED_IMAGE } from '@/store/mutation-type'

const { t } = useI18n()
const store = useStore()

const fileInputRef = ref<HTMLInputElement>()
const referenceImage = ref('')
const selectedGender = ref<AIGender>(DEFAULT_AI_GENDER)
const selectedTemplateId = ref<AIPromptTemplateId>(DEFAULT_AI_TEMPLATE_ID)
const promptDrafts = reactive(createAIPromptDrafts())
const prompt = computed({
  get: () => promptDrafts[selectedGender.value][selectedTemplateId.value],
  set: (value: string) => {
    promptDrafts[selectedGender.value][selectedTemplateId.value] = value
  },
})
const generating = ref(false)
const errorCode = ref('')

const generatedImage = computed(() => store.generatedImage)
const errorText = computed(() =>
  errorCode.value ? t(`text.aiError.${errorCode.value}`) : ''
)

async function handleSelectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) return

  errorCode.value = ''
  try {
    referenceImage.value = await prepareReferenceImage(file)
  } catch (error) {
    errorCode.value =
      error instanceof AIImageError ? error.code : 'image_load_failed'
  }
}

function removeImage() {
  referenceImage.value = ''
  errorCode.value = ''
}

async function handleGenerate() {
  if (!referenceImage.value || generating.value) return

  errorCode.value = ''
  generating.value = true

  try {
    const image = await generateAIImage(referenceImage.value, prompt.value)
    store[SET_GENERATED_IMAGE](image)
  } catch (error) {
    errorCode.value =
      error instanceof AIImageError ? error.code : 'generate_failed'
  } finally {
    generating.value = false
  }
}
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.ai-generator {
  display: flex;
  flex-direction: column;
  row-gap: 0.8rem;

  .file-input {
    display: none;
  }

  .reference-image {
    display: block;
    width: 100%;
    max-height: 12rem;
    object-fit: contain;
    background: #fff;
    border-radius: 0.5rem;
  }

  .ai-option-group {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
  }

  .ai-option-label,
  .prompt-label {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    font-weight: bold;
  }

  .ai-option-list {
    display: flex;
    column-gap: 0.4rem;
  }

  .ai-option-btn {
    flex: 1;
    min-width: 0;
    padding: 0.55rem 0.25rem;
    overflow: hidden;
    color: var.$color-text;
    font: inherit;
    font-size: 0.82rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    background: color.adjust(var.$color-dark, $lightness: 8%);
    border: 0;
    border-radius: 0.45rem;
    outline: none;

    &:hover:not(:disabled),
    &:focus-visible {
      background: color.adjust(var.$color-dark, $lightness: 14%);
      outline: 2px solid var.$color-primary;
      outline-offset: 2px;
    }

    &.active {
      color: #fff;
      font-weight: bold;
      background: var.$color-primary;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  .prompt-input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.7rem;
    color: var.$color-text;
    font: inherit;
    line-height: 1.5;
    resize: vertical;
    background: color.adjust(var.$color-dark, $lightness: 5%);
    border: 1px solid color.adjust(var.$color-dark, $lightness: 15%);
    border-radius: 0.5rem;
    outline: none;

    &:focus {
      border-color: var.$color-primary;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }
  }

  .prompt-count {
    margin-top: -0.4rem;
    color: color.adjust(var.$color-text, $lightness: -15%);
    font-size: 0.75rem;
    text-align: right;
  }

  .ai-btn {
    padding: 0.65rem 0.8rem;
    color: var.$color-text;
    font: inherit;
    cursor: pointer;
    background: color.adjust(var.$color-dark, $lightness: 10%);
    border: 0;
    border-radius: 0.5rem;

    &:hover:not(:disabled),
    &:focus-visible {
      background: color.adjust(var.$color-dark, $lightness: 15%);
      outline: 2px solid var.$color-primary;
      outline-offset: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &.primary {
      color: #fff;
      background: var.$color-primary;
    }

    &.secondary {
      font-size: 0.85rem;
    }
  }

  .error-text {
    margin: 0;
    color: #ff8794;
    font-size: 0.85rem;
    line-height: 1.4;
  }
}
</style>
