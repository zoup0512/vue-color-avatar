import { Gender } from '../enums'
import {
  AI_FEEDBACK_STORAGE_KEY,
  AI_FEEDBACK_TAGS,
  aiFeedbackRecords,
  aiFeedbackStorageFailed,
  buildRefinementPrompt,
  clearAIFeedbackRecords,
  createGenerationMetadata,
  emptyAIFeedback,
  getAIImageRecord,
  imageIdentity,
  loadAIFeedbackRecords,
  MAX_FEEDBACK_RECORDS,
  saveAIFeedbackRecords,
  updateAIImageRecord,
} from '../services/ai-feedback'
import { generateAIImage, MAX_AI_PROMPT_LENGTH } from '../services/ai-image'

beforeEach(() => {
  localStorage.clear()
  aiFeedbackRecords.value = []
  jest.restoreAllMocks()
})

const metadata = () =>
  createGenerationMetadata('custom:original', Gender.Female, 'Original prompt')
const labels = {
  keep: 'Keep',
  change: 'Change',
  tags: Object.fromEntries(AI_FEEDBACK_TAGS.map((tag) => [tag, tag])) as Record<
    (typeof AI_FEEDBACK_TAGS)[number],
    string
  >,
}

test('snapshots retain their generation template, gender and prompt after other generations', () => {
  const original = metadata()
  updateAIImageRecord('/first.png', undefined, original)
  updateAIImageRecord(
    '/batch.png',
    undefined,
    createGenerationMetadata('cool', Gender.Male, 'Batch prompt')
  )
  original.prompt = 'mutated'
  expect(
    loadAIFeedbackRecords().find(
      (r) => r.imageId === imageIdentity('/first.png')
    )?.metadata
  ).toMatchObject({
    templateId: 'custom:original',
    gender: Gender.Female,
    prompt: 'Original prompt',
  })
  expect(getAIImageRecord('/batch.png')?.metadata?.templateId).toBe('cool')
})

test('revision identifiers are content based rather than schema versions', () => {
  expect(metadata().revisionId).toBe(metadata().revisionId)
  expect(
    createGenerationMetadata('custom:original', Gender.Female, 'Changed')
      .revisionId
  ).not.toBe(metadata().revisionId)
  expect(
    createGenerationMetadata('custom:original', Gender.Male, 'Original prompt')
      .revisionId
  ).not.toBe(metadata().revisionId)
  expect(
    createGenerationMetadata(
      'custom:original',
      Gender.Female,
      'Original prompt',
      'Refined'
    ).revisionId
  ).not.toBe(metadata().revisionId)
})

test('preserves explicit text and rebuilds refinements without suffix accumulation', () => {
  const feedback = {
    ...emptyAIFeedback(),
    keep: '  eyes exactly as-is  ',
    change: 'Do not infer anything',
    tags: ['moreNatural', 'moreNatural'] as const,
  }
  const draft = { ...feedback, tags: [...feedback.tags] }
  const first = buildRefinementPrompt('Base', draft, labels)
  expect(first).toBe(
    'Base\nChange: moreNatural\nKeep:   eyes exactly as-is  \nChange: Do not infer anything'
  )
  expect(buildRefinementPrompt('Base', draft, labels)).toBe(first)
  draft.change = 'Replace only this instruction'
  expect(buildRefinementPrompt('Base', draft, labels)).not.toContain(
    'Do not infer anything'
  )
})

test('never truncates an overlong refinement or sends an invalid generation prompt', async () => {
  const prompt = buildRefinementPrompt(
    'x'.repeat(MAX_AI_PROMPT_LENGTH),
    { ...emptyAIFeedback(), change: 'longer' },
    labels
  )
  expect(prompt.length).toBeGreaterThan(MAX_AI_PROMPT_LENGTH)
  expect(() => createGenerationMetadata('cute', Gender.Female, prompt)).toThrow(
    'invalid_prompt'
  )
  await expect(generateAIImage('image', prompt)).rejects.toMatchObject({
    code: 'invalid_prompt',
  })
  await expect(generateAIImage('image', '  ')).rejects.toMatchObject({
    code: 'invalid_prompt',
  })
  expect(
    createGenerationMetadata('cute', Gender.Female, 'x'.repeat(2000)).prompt
  ).toHaveLength(2000)
})

test('unknown history stays unattributed and ratings preserve other feedback', () => {
  updateAIImageRecord('/old.png', { satisfaction: 'neutral', keep: 'eyes' })
  updateAIImageRecord('/old.png', { satisfaction: 'satisfied' })
  expect(getAIImageRecord('/old.png')).toMatchObject({
    metadata: null,
    feedback: { satisfaction: 'satisfied', keep: 'eyes' },
  })
})

test('persists URL or hash, never base64 image data, and retains applied status', () => {
  const image = 'data:image/png;base64,SECRETIMAGE'
  updateAIImageRecord(
    image,
    {
      appliedPrompt: 'Refined prompt',
      tags: ['softerColors'],
      change: 'colors',
    },
    metadata()
  )
  expect(localStorage.getItem(AI_FEEDBACK_STORAGE_KEY)).not.toContain(
    'SECRETIMAGE'
  )
  expect(loadAIFeedbackRecords()[0]).toMatchObject({
    imageId: imageIdentity(image),
    imageUrl: null,
    feedback: { appliedPrompt: 'Refined prompt' },
  })
  updateAIImageRecord('https://example.com/image.png')
  expect(getAIImageRecord('https://example.com/image.png')?.imageUrl).toBe(
    'https://example.com/image.png'
  )
})

test.each([
  'not json',
  'null',
  '{"version":2,"records":[]}',
  '{"version":1,"records":{}}',
])('defends against broken or unknown storage: %s', (value) => {
  localStorage.setItem(AI_FEEDBACK_STORAGE_KEY, value)
  expect(loadAIFeedbackRecords()).toEqual([])
})

test('filters malformed records, duplicate identities, invalid fields and forged revisions', () => {
  updateAIImageRecord('/ok.png', undefined, metadata())
  const record = loadAIFeedbackRecords()[0]
  localStorage.setItem(
    AI_FEEDBACK_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      records: [
        null,
        42,
        {},
        {
          ...record,
          imageUrl: 'data:image/png;base64,SECRET',
          metadata: { ...record.metadata, revisionId: 'forged' },
          feedback: {
            satisfaction: 'bogus',
            tags: ['softerColors', 'bogus'],
            keep: 'x'.repeat(501),
            change: 42,
            appliedPrompt: 'x'.repeat(2001),
          },
        },
        record,
      ],
    })
  )
  const records = loadAIFeedbackRecords()
  expect(records).toHaveLength(1)
  expect(records[0].metadata?.revisionId).toBe(metadata().revisionId)
  expect(records[0]).toMatchObject({
    imageUrl: null,
    feedback: {
      satisfaction: null,
      tags: ['softerColors'],
      keep: '',
      change: '',
      appliedPrompt: null,
    },
  })
})

test('bounds records, rejects oversized storage and clears local records', () => {
  const records = Array.from({ length: MAX_FEEDBACK_RECORDS + 10 }, (_, i) => ({
    imageId: imageIdentity(String(i)),
    imageUrl: null,
    metadata: null,
    feedback: emptyAIFeedback(),
    updatedAt: i,
  }))
  expect(saveAIFeedbackRecords(records)).toBe(true)
  expect(loadAIFeedbackRecords()).toHaveLength(MAX_FEEDBACK_RECORDS)
  expect(loadAIFeedbackRecords()[0].updatedAt).toBe(MAX_FEEDBACK_RECORDS + 9)
  localStorage.setItem(AI_FEEDBACK_STORAGE_KEY, 'x'.repeat(1500001))
  expect(loadAIFeedbackRecords()).toEqual([])
  clearAIFeedbackRecords()
  expect(loadAIFeedbackRecords()).toEqual([])
  expect(aiFeedbackRecords.value).toEqual([])
})

test('storage failures do not throw or lose shared session feedback', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  updateAIImageRecord('/session.png', { satisfaction: 'satisfied' })
  expect(aiFeedbackStorageFailed.value).toBe(true)
  expect(getAIImageRecord('/session.png')?.feedback.satisfaction).toBe(
    'satisfied'
  )
  expect(saveAIFeedbackRecords([])).toBe(false)
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied')
  })
  expect(loadAIFeedbackRecords()).toEqual([])
})
