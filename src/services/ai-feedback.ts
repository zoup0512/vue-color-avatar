import hash from 'object-hash'
import { ref } from 'vue'

import {
  type AIGender,
  AI_GENDERS,
  AIImageError,
  MAX_AI_PROMPT_LENGTH,
} from './ai-image'

export const AI_FEEDBACK_STORAGE_KEY = 'vue-color-avatar:ai-feedback'
export const MAX_FEEDBACK_RECORDS = 100
export const MAX_FEEDBACK_TEXT_LENGTH = 500
const MAX_STORAGE_LENGTH = 1500000
export const AI_FEEDBACK_TAGS = [
  'closerReference',
  'lessChildlike',
  'moreNatural',
  'simplerBackground',
  'softerColors',
  'differentComposition',
] as const
export const AI_SATISFACTIONS = ['satisfied', 'neutral', 'unsatisfied'] as const
export type AIFeedbackTag = (typeof AI_FEEDBACK_TAGS)[number]
export type AISatisfaction = (typeof AI_SATISFACTIONS)[number]

export interface AIGenerationMetadata {
  templateId: string
  gender: AIGender
  templatePrompt: string
  prompt: string
  revisionId: string
  createdAt: number
  parentImageId: string | null
}

export interface AIFeedback {
  satisfaction: AISatisfaction | null
  tags: AIFeedbackTag[]
  keep: string
  change: string
  appliedPrompt: string | null
}

export interface AIImageRecord {
  imageId: string
  imageUrl: string | null
  metadata: AIGenerationMetadata | null
  feedback: AIFeedback
  updatedAt: number
}

export interface AIGeneratedPayload {
  image: string
  metadata: AIGenerationMetadata
}

export function emptyAIFeedback(): AIFeedback {
  return {
    satisfaction: null,
    tags: [],
    keep: '',
    change: '',
    appliedPrompt: null,
  }
}

export function imageIdentity(image: string): string {
  return `image:${hash(image)}`
}

export function createGenerationMetadata(
  templateId: string,
  gender: AIGender,
  templatePrompt: string,
  prompt = templatePrompt,
  parentImageId: string | null = null
): AIGenerationMetadata {
  const normalized = prompt.trim()
  if (!normalized || normalized.length > MAX_AI_PROMPT_LENGTH) {
    throw new AIImageError('invalid_prompt')
  }
  return {
    templateId,
    gender,
    templatePrompt,
    prompt: normalized,
    revisionId: `revision:${hash({
      templateId,
      gender,
      templatePrompt,
      prompt: normalized,
    })}`,
    createdAt: Date.now(),
    parentImageId,
  }
}

/** Rebuild from the original template snapshot, never from a prior suffix. */
export function buildRefinementPrompt(
  base: string,
  feedback: Pick<AIFeedback, 'tags' | 'keep' | 'change'>,
  labels: { keep: string; change: string; tags: Record<AIFeedbackTag, string> }
): string {
  return [
    base.trim(),
    ...AI_FEEDBACK_TAGS.filter((tag) => feedback.tags.includes(tag)).map(
      (tag) => `${labels.change}: ${labels.tags[tag]}`
    ),
    feedback.keep.trim() ? `${labels.keep}: ${feedback.keep}` : '',
    feedback.change.trim() ? `${labels.change}: ${feedback.change}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function isText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}

function safeUrl(value: unknown): value is string {
  return isText(value, 2048) && /^(https?:\/\/|\/[^/])/i.test(value)
}

function sanitizeRecord(value: unknown): AIImageRecord | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as AIImageRecord
  if (!isText(raw.imageId, 80) || !/^image:[a-f0-9]{40}$/.test(raw.imageId))
    return null
  if (!Number.isFinite(raw.updatedAt) || raw.updatedAt < 0) return null
  const f = raw.feedback
  if (!f || typeof f !== 'object') return null
  let metadata: AIGenerationMetadata | null = null
  const m = raw.metadata
  if (
    m &&
    isText(m.templateId, 200) &&
    AI_GENDERS.includes(m.gender) &&
    isText(m.templatePrompt, MAX_AI_PROMPT_LENGTH) &&
    isText(m.prompt, MAX_AI_PROMPT_LENGTH) &&
    m.prompt.trim() &&
    Number.isFinite(m.createdAt) &&
    m.createdAt >= 0
  ) {
    metadata = createGenerationMetadata(
      m.templateId,
      m.gender,
      m.templatePrompt,
      m.prompt,
      isText(m.parentImageId, 80) &&
        /^image:[a-f0-9]{40}$/.test(m.parentImageId)
        ? m.parentImageId
        : null
    )
    metadata.createdAt = m.createdAt
  }
  return {
    imageId: raw.imageId,
    imageUrl: safeUrl(raw.imageUrl) ? raw.imageUrl : null,
    metadata,
    updatedAt: raw.updatedAt,
    feedback: {
      satisfaction: AI_SATISFACTIONS.includes(f.satisfaction as AISatisfaction)
        ? f.satisfaction
        : null,
      tags: AI_FEEDBACK_TAGS.filter(
        (tag) => Array.isArray(f.tags) && f.tags.includes(tag)
      ),
      keep: isText(f.keep, MAX_FEEDBACK_TEXT_LENGTH) ? f.keep : '',
      change: isText(f.change, MAX_FEEDBACK_TEXT_LENGTH) ? f.change : '',
      appliedPrompt:
        isText(f.appliedPrompt, MAX_AI_PROMPT_LENGTH) && f.appliedPrompt.trim()
          ? f.appliedPrompt
          : null,
    },
  }
}

function boundedRecords(records: unknown[]): AIImageRecord[] {
  const seen = new Set<string>()
  return records
    .slice(0, MAX_FEEDBACK_RECORDS * 2)
    .map(sanitizeRecord)
    .filter((record): record is AIImageRecord => !!record)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((record) => {
      if (seen.has(record.imageId)) return false
      seen.add(record.imageId)
      return true
    })
    .slice(0, MAX_FEEDBACK_RECORDS)
}

export function loadAIFeedbackRecords(): AIImageRecord[] {
  try {
    const text = localStorage.getItem(AI_FEEDBACK_STORAGE_KEY)
    if (!text || text.length > MAX_STORAGE_LENGTH) return []
    const raw = JSON.parse(text)
    if (raw?.version !== 1 || !Array.isArray(raw.records)) return []
    return boundedRecords(raw.records)
  } catch {
    return []
  }
}

export function saveAIFeedbackRecords(records: AIImageRecord[]): boolean {
  try {
    const text = JSON.stringify({
      version: 1,
      records: boundedRecords(records),
    })
    if (text.length > MAX_STORAGE_LENGTH) return false
    localStorage.setItem(AI_FEEDBACK_STORAGE_KEY, text)
    return true
  } catch {
    return false
  }
}

// Shared session state keeps both feedback surfaces synchronized, even if storage fails.
export const aiFeedbackRecords = ref<AIImageRecord[]>(loadAIFeedbackRecords())
export const aiFeedbackStorageFailed = ref(false)

export function getAIImageRecord(image: string): AIImageRecord | undefined {
  const id = imageIdentity(image)
  return aiFeedbackRecords.value.find((record) => record.imageId === id)
}

export function updateAIImageRecord(
  image: string,
  feedback?: Partial<AIFeedback>,
  metadata?: AIGenerationMetadata
): void {
  const existing = getAIImageRecord(image)
  const record: AIImageRecord = {
    imageId: imageIdentity(image),
    imageUrl: safeUrl(image) ? image : null,
    metadata: metadata ?? existing?.metadata ?? null,
    feedback: { ...(existing?.feedback ?? emptyAIFeedback()), ...feedback },
    updatedAt: Date.now(),
  }
  aiFeedbackRecords.value = boundedRecords([
    record,
    ...aiFeedbackRecords.value.filter(
      (item) => item.imageId !== record.imageId
    ),
  ])
  aiFeedbackStorageFailed.value = !saveAIFeedbackRecords(
    aiFeedbackRecords.value
  )
}

export function clearAIFeedbackRecords(): void {
  aiFeedbackRecords.value = []
  aiFeedbackStorageFailed.value = !saveAIFeedbackRecords([])
}
