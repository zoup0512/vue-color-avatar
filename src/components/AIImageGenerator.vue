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
          class="ai-option-list wrap"
          role="group"
          :aria-label="t('label.aiPromptTemplate')"
        >
          <button
            v-for="template in templateOptions"
            :key="template.id"
            type="button"
            class="ai-option-btn"
            :class="{
              active: selectedTemplateId === template.id,
              custom: template.custom,
            }"
            :aria-pressed="selectedTemplateId === template.id"
            :title="template.name"
            :disabled="generating"
            @click="selectedTemplateId = template.id"
          >
            <span class="tpl-name">{{ template.name }}</span>
            <span
              v-if="template.custom"
              class="tpl-delete"
              role="button"
              :aria-label="t('action.deleteCustomTemplate')"
              :title="t('action.deleteCustomTemplate')"
              @click.stop="removeCustomTemplate(template.id)"
            >
              ×
            </span>
          </button>
          <button
            type="button"
            class="ai-option-btn add-btn"
            :aria-label="t('action.createCustomTemplate')"
            :title="t('action.createCustomTemplate')"
            :disabled="generating"
            @click="startCreateTemplate"
          >
            ＋
          </button>
        </div>

        <p v-if="namingMode === 'seed'" class="seed-hint">
          {{ t('text.templateSeedHint') }}
        </p>
        <div v-if="namingMode" class="template-naming">
          <input
            v-model="templateNameInput"
            type="text"
            class="name-input"
            :maxlength="MAX_CUSTOM_TEMPLATE_NAME_LENGTH"
            :placeholder="t('label.customTemplateName')"
            @keyup.enter="confirmTemplateNaming"
          />
          <button
            type="button"
            class="ai-btn secondary"
            :disabled="!templateNameInput.trim()"
            @click="confirmTemplateNaming"
          >
            {{ t('action.confirm') }}
          </button>
          <button
            type="button"
            class="ai-btn secondary"
            @click="cancelTemplateNaming"
          >
            {{ t('action.cancel') }}
          </button>
        </div>
        <p v-if="templateNameError" class="error-text name-error">
          {{ templateNameError }}
        </p>
      </div>

      <label class="prompt-label" for="ai-image-prompt">
        {{ t('label.aiPrompt') }}
      </label>
      <textarea
        id="ai-image-prompt"
        v-model="prompt"
        class="prompt-input"
        rows="8"
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

      <button
        type="button"
        class="ai-btn secondary"
        :disabled="generating"
        @click="startSaveAsTemplate"
      >
        {{ t('action.saveAsCustomTemplate') }}
      </button>

      <p v-if="errorText" class="error-text">{{ errorText }}</p>

      <div class="generate-row">
        <button
          type="button"
          class="ai-btn primary"
          :disabled="generating || !referenceImage || !prompt.trim()"
          @click="handleGenerate"
        >
          {{
            singleGenerating
              ? t('action.generatingAIImage')
              : generatedImage
              ? t('action.regenerateAIImage')
              : t('action.generateAIImage')
          }}
        </button>
        <button
          type="button"
          class="ai-btn batch-btn"
          :disabled="singleGenerating || !referenceImage"
          @click="store[SET_AI_BATCH_MODAL_VISIBLE](true)"
        >
          {{
            batchRunning
              ? `${t('action.batchGenerate')} (${batchProgressText})`
              : t('action.batchGenerate')
          }}
        </button>
      </div>

      <AIBatchGenerateModal
        :visible="store.aiBatchModalVisible"
        :templates="templateOptions"
        :prompts="promptDrafts[selectedGender]"
        :reference-image="referenceImage"
        :gender="selectedGender"
        :gender-label="t(`gender.${selectedGender}`)"
        @generated="handleBatchGenerated"
        @progress="handleBatchProgress"
        @update:running="batchRunning = $event"
        @close="store[SET_AI_BATCH_MODAL_VISIBLE](false)"
      />
      <section v-if="generatedImage" class="feedback-section">
        <h3>{{ t('feedback.title') }}</h3>
        <p class="feedback-hint">{{ t('feedback.localNotice') }}</p>
        <p v-if="aiFeedbackStorageFailed" class="error-text">
          {{ t('feedback.storageFailed') }}
        </p>
        <div class="ai-option-list wrap">
          <button
            v-for="rating in AI_SATISFACTIONS"
            :key="rating"
            type="button"
            class="ai-option-btn"
            :class="{ active: currentRecord?.feedback.satisfaction === rating }"
            :aria-pressed="currentRecord?.feedback.satisfaction === rating"
            @click="
              updateAIImageRecord(generatedImage, {
                satisfaction:
                  currentRecord?.feedback.satisfaction === rating
                    ? null
                    : rating,
              })
            "
          >
            {{ t(`feedback.${rating}`) }}
          </button>
        </div>
        <details v-if="currentRecord?.metadata">
          <summary>{{ t('feedback.snapshot') }}</summary>
          <p>
            {{ currentRecord.metadata.templateId }} ·
            {{ t(`gender.${currentRecord.metadata.gender}`) }}
          </p>
          <p>{{ currentRecord.metadata.revisionId }}</p>
          <pre>{{ currentRecord.metadata.prompt }}</pre>
        </details>
        <p v-else class="feedback-hint">{{ t('feedback.unknown') }}</p>
        <div class="ai-option-list wrap">
          <button
            v-for="tag in AI_FEEDBACK_TAGS"
            :key="tag"
            type="button"
            class="ai-option-btn"
            :class="{ active: feedbackDraft.tags.includes(tag) }"
            :aria-pressed="feedbackDraft.tags.includes(tag)"
            @click="toggleFeedbackTag(tag)"
          >
            {{ t(`feedback.tags.${tag}`) }}
          </button>
        </div>
        <label class="prompt-label" for="ai-feedback-keep">{{
          t('feedback.keep')
        }}</label>
        <textarea
          id="ai-feedback-keep"
          v-model="feedbackDraft.keep"
          class="prompt-input"
          rows="2"
          :maxlength="MAX_FEEDBACK_TEXT_LENGTH"
        />
        <label class="prompt-label" for="ai-feedback-change">{{
          t('feedback.change')
        }}</label>
        <textarea
          id="ai-feedback-change"
          v-model="feedbackDraft.change"
          class="prompt-input"
          rows="2"
          :maxlength="MAX_FEEDBACK_TEXT_LENGTH"
        />
        <button type="button" class="ai-btn secondary" @click="saveFeedback">
          {{ t('feedback.save') }}
        </button>
        <button
          type="button"
          class="ai-btn secondary"
          :disabled="!currentRecord?.metadata"
          @click="previewVisible = true"
        >
          {{ t('feedback.preview') }}
        </button>
        <template v-if="previewVisible && currentRecord?.metadata">
          <pre class="refinement-preview">{{ refinementPreview }}</pre>
          <p class="feedback-hint">
            {{ refinementPreview.length }} / {{ MAX_AI_PROMPT_LENGTH }}
          </p>
          <p v-if="!refinementValid" class="error-text">
            {{ t('feedback.tooLong') }}
          </p>
          <button
            type="button"
            class="ai-btn secondary"
            :disabled="!refinementValid"
            @click="applyFeedback"
          >
            {{ t('feedback.apply') }}
          </button>
        </template>
        <button
          type="button"
          class="ai-btn"
          :disabled="!appliedRefinement || generating || !referenceImage"
          @click="regenerateFeedback"
        >
          {{ t('feedback.regenerate') }}
        </button>
      </section>
    </div>
  </SectionWrapper>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import defaultReferenceImageUrl from '@/assets/ai-reference-default.jpg'
import AIBatchGenerateModal from '@/components/Modal/AIBatchGenerateModal.vue'
import SectionWrapper from '@/components/SectionWrapper.vue'
import { Gender } from '@/enums'
import {
  type AIFeedback,
  type AIFeedbackTag,
  type AIGeneratedPayload,
  type AIGenerationMetadata,
  AI_FEEDBACK_TAGS,
  AI_SATISFACTIONS,
  aiFeedbackStorageFailed,
  buildRefinementPrompt,
  createGenerationMetadata,
  emptyAIFeedback,
  getAIImageRecord,
  imageIdentity,
  MAX_FEEDBACK_TEXT_LENGTH,
  updateAIImageRecord,
} from '@/services/ai-feedback'
import {
  type AICustomTemplate,
  type AIGender,
  type AITemplateOption,
  AI_GENDERS,
  AI_PROMPT_TEMPLATE_IDS,
  AIImageError,
  createAIPromptDrafts,
  createCustomTemplateId,
  DEFAULT_AI_GENDER,
  DEFAULT_AI_TEMPLATE_ID,
  generateAIImage,
  isCustomTemplateId,
  loadAICustomTemplates,
  loadGeneratedImageHistory,
  MAX_AI_PROMPT_LENGTH,
  MAX_CUSTOM_TEMPLATE_COUNT,
  MAX_CUSTOM_TEMPLATE_NAME_LENGTH,
  prepareReferenceImage,
  prepareReferenceImageFromUrl,
  saveAICustomTemplates,
} from '@/services/ai-image'
import { useStore } from '@/store'
import {
  SET_AI_BATCH_MODAL_VISIBLE,
  SET_AI_TEMPLATE_SEED_PROMPT,
  SET_CURRENT_GENERATED_IMAGE,
  SET_GENERATED_IMAGE,
  SET_GENERATED_IMAGES,
} from '@/store/mutation-type'

const { t } = useI18n()
const store = useStore()

const fileInputRef = ref<HTMLInputElement>()
const referenceImage = ref('')
const selectedGender = ref<AIGender>(DEFAULT_AI_GENDER)
const selectedTemplateId = ref<string>(DEFAULT_AI_TEMPLATE_ID)
const promptDrafts = reactive<Record<AIGender, Record<string, string>>>(
  createAIPromptDrafts()
)
const customTemplates = ref<AICustomTemplate[]>([])
const singleGenerating = ref(false)
const errorCode = ref('')

// 自定义模板命名表单：create 为从零新建，saveAs 为把当前模板另存为自定义模板，
// seed 为把生图 Prompt 卡片带来的 prompt 存成新模板
const namingMode = ref<'create' | 'saveAs' | 'seed' | null>(null)
const templateNameInput = ref('')
const templateNameError = ref('')

// 批量生成（弹窗开闭放在 store，顶部操作栏的“批量生成”按钮也会打开同一个弹窗）
const batchRunning = ref(false)
const batchProgressText = ref('')

const generating = computed(() => singleGenerating.value || batchRunning.value)

const prompt = computed({
  get: () => promptDrafts[selectedGender.value][selectedTemplateId.value] ?? '',
  set: (value: string) => {
    promptDrafts[selectedGender.value][selectedTemplateId.value] = value
  },
})

const templateOptions = computed<AITemplateOption[]>(() => [
  ...AI_PROMPT_TEMPLATE_IDS.map((id) => ({
    id,
    name: t(`aiPromptTemplate.${id}`),
    custom: false,
  })),
  ...customTemplates.value.map((template) => ({
    id: template.id,
    name: template.name,
    custom: true,
  })),
])

const generatedImage = computed(() => store.generatedImage)
const currentRecord = computed(() =>
  generatedImage.value ? getAIImageRecord(generatedImage.value) : undefined
)
const feedbackDraft = ref(emptyAIFeedback())
const previewVisible = ref(false)
const appliedRefinement = ref<AIGenerationMetadata | null>(null)
const refinementPreview = computed(() =>
  buildRefinementPrompt(
    currentRecord.value?.metadata?.templatePrompt ?? '',
    feedbackDraft.value,
    {
      keep: t('feedback.keep'),
      change: t('feedback.change'),
      tags: Object.fromEntries(
        AI_FEEDBACK_TAGS.map((tag) => [tag, t(`feedback.tags.${tag}`)])
      ) as Record<AIFeedbackTag, string>,
    }
  )
)
const refinementValid = computed(
  () =>
    !!refinementPreview.value.trim() &&
    refinementPreview.value.length <= MAX_AI_PROMPT_LENGTH
)
watch(
  generatedImage,
  () => {
    const feedback = currentRecord.value?.feedback ?? emptyAIFeedback()
    feedbackDraft.value = { ...feedback, tags: [...feedback.tags] }
    previewVisible.value = false
    appliedRefinement.value = null
  },
  { immediate: true }
)
watch(
  refinementPreview,
  () => {
    appliedRefinement.value = null
  },
  { flush: 'sync' }
)
function toggleFeedbackTag(tag: AIFeedbackTag) {
  feedbackDraft.value.tags = feedbackDraft.value.tags.includes(tag)
    ? feedbackDraft.value.tags.filter((item) => item !== tag)
    : [...feedbackDraft.value.tags, tag]
}
function saveFeedback() {
  updateAIImageRecord(generatedImage.value, {
    tags: [...feedbackDraft.value.tags],
    keep: feedbackDraft.value.keep,
    change: feedbackDraft.value.change,
    appliedPrompt: appliedRefinement.value?.prompt ?? null,
  })
}
function applyFeedback() {
  const metadata = currentRecord.value?.metadata
  if (!metadata || !refinementValid.value) return
  appliedRefinement.value = createGenerationMetadata(
    metadata.templateId,
    metadata.gender,
    metadata.templatePrompt,
    refinementPreview.value,
    imageIdentity(generatedImage.value)
  )
  saveFeedback()
}
async function regenerateFeedback() {
  if (appliedRefinement.value)
    await runGeneration(
      { ...appliedRefinement.value, createdAt: Date.now() },
      {
        ...feedbackDraft.value,
        tags: [...feedbackDraft.value.tags],
        satisfaction: null,
        appliedPrompt: null,
      }
    )
}

const errorText = computed(() =>
  errorCode.value ? t(`text.aiError.${errorCode.value}`) : ''
)

// 自定义模板保存在 localStorage，页面刷新后仍可用
customTemplates.value = loadAICustomTemplates()
syncCustomTemplateDrafts()

onMounted(async () => {
  // 预加载默认底模，作为 AI 图生图的初始参考图
  try {
    referenceImage.value = await prepareReferenceImageFromUrl(
      defaultReferenceImageUrl
    )
  } catch {
    // 默认底模加载失败时保持空参考图，不影响后续手动上传
  }

  // 拉取服务器端保存的生图历史，填充右侧历史面板（接口返回最新在前，反转后按旧→新存储）
  const history = await loadGeneratedImageHistory()
  if (history.length > 0) {
    store[SET_GENERATED_IMAGES]([...history].reverse())
    // 默认展示最新一张历史生图，避免 AI 模式回退显示普通头像
    store[SET_CURRENT_GENERATED_IMAGE](history[0].url)
  }
})

function syncCustomTemplateDrafts() {
  for (const template of customTemplates.value) {
    for (const gender of AI_GENDERS) {
      if (promptDrafts[gender][template.id] === undefined) {
        promptDrafts[gender][template.id] = template.prompts[gender] ?? ''
      }
    }
  }
}

function persistCustomTemplates() {
  saveAICustomTemplates(customTemplates.value)
}

function flushCustomTemplateDraft() {
  const templateId = selectedTemplateId.value
  if (!isCustomTemplateId(templateId)) return

  const template = customTemplates.value.find((item) => item.id === templateId)
  if (!template) return

  for (const gender of AI_GENDERS) {
    template.prompts[gender] = promptDrafts[gender][templateId] ?? ''
  }
  persistCustomTemplates()
}

// 编辑自定义模板的生成要求时自动保存（防抖，避免每个按键都写 localStorage）
let persistTimer: ReturnType<typeof setTimeout> | undefined
watch(prompt, () => {
  if (!isCustomTemplateId(selectedTemplateId.value)) return

  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = undefined
    flushCustomTemplateDraft()
  }, 600)
})

// 生图 Prompt 卡片的「存为模板」：seed 一旦写入即打开命名表单，确认后创建模板
watch(
  () => store.aiTemplateSeedPrompt,
  (seed) => {
    if (!seed) return

    if (generating.value) {
      // 生成中不接受新模板命名，直接清掉 seed 避免表单被锁死
      store[SET_AI_TEMPLATE_SEED_PROMPT]('')
      return
    }

    namingMode.value = 'seed'
    templateNameInput.value = ''
    templateNameError.value = ''
  }
)

function startCreateTemplate() {
  namingMode.value = 'create'
  templateNameInput.value = ''
  templateNameError.value = ''
}

function startSaveAsTemplate() {
  namingMode.value = 'saveAs'
  templateNameInput.value = ''
  templateNameError.value = ''
}

function cancelTemplateNaming() {
  if (namingMode.value === 'seed') {
    store[SET_AI_TEMPLATE_SEED_PROMPT]('')
  }
  namingMode.value = null
  templateNameInput.value = ''
  templateNameError.value = ''
}

function confirmTemplateNaming() {
  if (!namingMode.value) return

  const name = templateNameInput.value.trim()
  if (!name) {
    templateNameError.value = t('text.customTemplateNameRequired')
    return
  }
  if (customTemplates.value.some((template) => template.name === name)) {
    templateNameError.value = t('text.customTemplateNameDuplicate')
    return
  }
  if (customTemplates.value.length >= MAX_CUSTOM_TEMPLATE_COUNT) {
    templateNameError.value = t('text.customTemplateLimitReached', {
      max: MAX_CUSTOM_TEMPLATE_COUNT,
    })
    return
  }

  const seedPrompt =
    namingMode.value === 'seed' ? store.aiTemplateSeedPrompt : ''
  const prompts =
    namingMode.value === 'saveAs'
      ? // 另存为：把当前模板（内置或自定义）两个性别的草稿一起带过去
        ({
          [Gender.Female]:
            promptDrafts[Gender.Female][selectedTemplateId.value] ?? '',
          [Gender.Male]:
            promptDrafts[Gender.Male][selectedTemplateId.value] ?? '',
        } as Record<AIGender, string>)
      : namingMode.value === 'seed'
      ? // 从生图 Prompt 卡片新建：两个性别都用该 prompt，之后可分别编辑
        ({
          [Gender.Female]: seedPrompt,
          [Gender.Male]: seedPrompt,
        } as Record<AIGender, string>)
      : ({ [Gender.Female]: '', [Gender.Male]: '' } as Record<AIGender, string>)

  const template: AICustomTemplate = {
    id: createCustomTemplateId(),
    name,
    prompts,
  }

  customTemplates.value = [...customTemplates.value, template]
  syncCustomTemplateDrafts()
  persistCustomTemplates()
  selectedTemplateId.value = template.id
  cancelTemplateNaming()
}

function removeCustomTemplate(templateId: string) {
  const template = customTemplates.value.find((item) => item.id === templateId)
  if (!template) return

  if (!window.confirm(t('text.confirmDeleteTemplate', { name: template.name })))
    return

  customTemplates.value = customTemplates.value.filter(
    (item) => item.id !== templateId
  )
  for (const gender of AI_GENDERS) {
    delete promptDrafts[gender][templateId]
  }
  persistCustomTemplates()

  if (selectedTemplateId.value === templateId) {
    selectedTemplateId.value = DEFAULT_AI_TEMPLATE_ID
  }
  cancelTemplateNaming()
}

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

  try {
    const metadata = createGenerationMetadata(
      selectedTemplateId.value,
      selectedGender.value,
      prompt.value
    )
    flushCustomTemplateDraft()
    await runGeneration(metadata)
  } catch (error) {
    errorCode.value =
      error instanceof AIImageError ? error.code : 'generate_failed'
  }
}

async function runGeneration(
  metadata: AIGenerationMetadata,
  feedback?: AIFeedback
) {
  if (!referenceImage.value || generating.value) return
  errorCode.value = ''
  singleGenerating.value = true
  try {
    const image = await generateAIImage(referenceImage.value, metadata.prompt)
    updateAIImageRecord(image, feedback, metadata)
    store[SET_GENERATED_IMAGE](image)
  } catch (error) {
    errorCode.value =
      error instanceof AIImageError ? error.code : 'generate_failed'
  } finally {
    singleGenerating.value = false
  }
}

function handleBatchGenerated({ image, metadata }: AIGeneratedPayload) {
  updateAIImageRecord(image, undefined, metadata)
  store[SET_GENERATED_IMAGE](image)
}

function handleBatchProgress(progress: { current: number; total: number }) {
  batchProgressText.value = `${progress.current}/${progress.total}`
}
</script>

<style lang="scss" scoped>
@use 'src/styles/var';
@use 'sass:color';

.ai-generator {
  display: flex;
  flex-direction: column;
  row-gap: 0.8rem;

  .feedback-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
    padding-top: 0.8rem;
    border-top: 1px solid var.$color-border-strong;

    .ai-option-btn {
      white-space: normal;
    }
    details,
    pre {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
  }

  .feedback-hint {
    margin: 0;
    color: var.$color-text-muted;
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .file-input {
    display: none;
  }

  .reference-image {
    display: block;
    width: 100%;
    max-height: 12rem;
    object-fit: contain;
    background: #fff;
    border: 1px solid var.$color-border-strong;
    border-radius: 0.7rem;
  }

  .ai-option-group {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
  }

  .ai-option-label,
  .prompt-label {
    margin-top: 0.5rem;
    color: var.$color-text-strong;
    font-size: 0.88rem;
    font-weight: 600;
  }

  .ai-option-list {
    display: flex;
    column-gap: 0.4rem;

    // 模板数量多,改为网格每行约 3 个自动换行,避免全部挤成一排
    &.wrap {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
      gap: 0.4rem;
    }
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
    background: rgba(var.$color-dark, 0.55);
    border: 1px solid transparent;
    border-radius: 0.6rem;
    outline: none;
    transition: background-color 0.2s, border-color 0.2s;

    &:hover:not(:disabled),
    &:focus-visible {
      background: color.adjust(var.$color-dark, $lightness: 14%);
      border-color: rgba(var.$color-accent, 0.5);
      outline: none;
    }

    &.active {
      color: #fff;
      font-weight: 600;
      background: linear-gradient(
        115deg,
        var.$color-primary,
        var.$color-secondary
      );
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    &.custom {
      display: inline-flex;
      flex: 0 1 auto;
      align-items: center;
      justify-content: center;
      gap: 0.15rem;
      border: 1px dashed color.adjust(var.$color-dark, $lightness: 24%);

      .tpl-name {
        overflow: hidden;
        min-width: 0;
        text-overflow: ellipsis;
      }

      .tpl-delete {
        flex-shrink: 0;
        padding: 0 0.15rem;
        font-size: 0.95rem;
        line-height: 1;
        opacity: 0.75;

        &:hover {
          color: #ff8794;
          opacity: 1;
        }
      }
    }

    &.add-btn {
      flex: 0 0 auto;
      min-width: 2.2rem;
      padding: 0.55rem 0.4rem;
      font-size: 0.95rem;
    }
  }

  .template-naming {
    display: flex;
    align-items: center;
    column-gap: 0.4rem;

    .name-input {
      flex: 1;
      min-width: 0;
      padding: 0.5rem 0.6rem;
      color: var.$color-text;
      font: inherit;
      font-size: 0.85rem;
      background: rgba(var.$color-dark, 0.55);
      border: 1px solid var.$color-border-strong;
      border-radius: 0.6rem;
      outline: none;

      &:focus {
        border-color: var.$color-primary;
      }
    }

    .ai-btn {
      flex: 0 0 auto;
      padding: 0.5rem 0.7rem;
    }
  }

  .name-error {
    margin: 0;
  }

  .seed-hint {
    margin: -0.3rem 0 0;
    color: color.adjust(var.$color-text, $lightness: -15%);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .prompt-input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.7rem;
    color: var.$color-text;
    font: inherit;
    line-height: 1.5;
    resize: vertical;
    background: rgba(var.$color-dark, 0.55);
    border: 1px solid var.$color-border-strong;
    border-radius: 0.7rem;
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
    color: var.$color-text-muted;
    font-size: 0.75rem;
    text-align: right;
  }

  .generate-row {
    display: flex;
    column-gap: 0.5rem;

    .ai-btn.primary {
      flex: 2;
      color: #fff;
      background: linear-gradient(
        115deg,
        var.$color-primary,
        var.$color-secondary
      );
      box-shadow: 0 0.4rem 1.2rem rgba(var.$color-accent, 0.3);

      &:hover:not(:disabled) {
        background: linear-gradient(
          115deg,
          color.adjust(var.$color-primary, $lightness: 5%),
          color.adjust(var.$color-secondary, $lightness: 5%)
        );
        box-shadow: 0 0.5rem 1.5rem rgba(var.$color-accent, 0.4);
      }
    }

    .ai-btn.batch-btn {
      flex: 1;
      min-width: 7rem;
    }
  }

  .ai-btn {
    padding: 0.65rem 0.8rem;
    color: var.$color-text;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    background: rgba(var.$color-dark, 0.55);
    border: 1px solid var.$color-border-strong;
    border-radius: 0.7rem;
    transition: background-color 0.2s, border-color 0.2s;

    &:hover:not(:disabled),
    &:focus-visible {
      background: color.adjust(var.$color-dark, $lightness: 14%);
      outline: none;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
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
