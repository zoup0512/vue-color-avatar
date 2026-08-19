import { Gender } from '../enums'
import {
  AI_GENDERS,
  AI_PROMPT_TEMPLATE_IDS,
  AI_PROMPT_TEMPLATES,
  createAIPromptDrafts,
  createCustomTemplateId,
  DEFAULT_AI_GENDER,
  DEFAULT_AI_PROMPT,
  DEFAULT_AI_TEMPLATE_ID,
  isCustomTemplateId,
  loadAICustomTemplates,
  MAX_AI_PROMPT_LENGTH,
  MAX_CUSTOM_TEMPLATE_COUNT,
  saveAICustomTemplates,
} from '../services/ai-image'

test('defines nine prompt templates for each AI gender', () => {
  expect(AI_GENDERS).toEqual([Gender.Female, Gender.Male])
  expect(AI_PROMPT_TEMPLATE_IDS).toEqual([
    'cute',
    'cool',
    'traditional',
    'fairy',
    'cyberpunk',
    'retro',
    'sporty',
    'idol',
    'campus',
  ])

  for (const gender of AI_GENDERS) {
    expect(Object.keys(AI_PROMPT_TEMPLATES[gender])).toEqual(
      AI_PROMPT_TEMPLATE_IDS
    )

    for (const templateId of AI_PROMPT_TEMPLATE_IDS) {
      const prompt = AI_PROMPT_TEMPLATES[gender][templateId]
      expect(prompt.trim().length).toBeGreaterThan(0)
      expect(prompt.length).toBeLessThanOrEqual(MAX_AI_PROMPT_LENGTH)
    }
  }
})

test('uses the female cute template by default', () => {
  expect(DEFAULT_AI_GENDER).toBe(Gender.Female)
  expect(DEFAULT_AI_TEMPLATE_ID).toBe('cute')
  expect(DEFAULT_AI_PROMPT).toBe(AI_PROMPT_TEMPLATES[Gender.Female].cute)
})

test('creates independent editable prompt drafts', () => {
  const drafts = createAIPromptDrafts()
  const originalFemaleCute = AI_PROMPT_TEMPLATES[Gender.Female].cute
  const originalMaleCute = AI_PROMPT_TEMPLATES[Gender.Male].cute

  drafts[Gender.Female].cute = 'custom prompt'

  expect(drafts[Gender.Female].cute).toBe('custom prompt')
  expect(drafts[Gender.Male].cute).toBe(originalMaleCute)
  expect(AI_PROMPT_TEMPLATES[Gender.Female].cute).toBe(originalFemaleCute)
})

test('saves and reloads custom templates from localStorage', () => {
  const template = {
    id: createCustomTemplateId(),
    name: '我的模板',
    prompts: {
      [Gender.Female]: '女性自定义提示词',
      [Gender.Male]: '男性自定义提示词',
    },
  }

  expect(isCustomTemplateId(template.id)).toBe(true)
  expect(isCustomTemplateId('cute')).toBe(false)

  saveAICustomTemplates([template])

  const loaded = loadAICustomTemplates()
  expect(loaded).toHaveLength(1)
  expect(loaded[0].name).toBe('我的模板')
  expect(loaded[0].prompts[Gender.Female]).toBe('女性自定义提示词')
  expect(loaded[0].prompts[Gender.Male]).toBe('男性自定义提示词')
})

test('drops broken custom template entries when loading', () => {
  localStorage.setItem(
    'vue-color-avatar:ai-custom-templates',
    JSON.stringify({
      version: 1,
      templates: [
        null,
        'bad-type',
        { id: 'cute', name: '内置 id 不允许' },
        { id: 'custom:1', name: '   ' },
        { id: 'custom:2', name: '提示词非法时保留模板', prompts: 'bad' },
        {
          id: 'custom:3',
          name: '正常模板',
          prompts: { [Gender.Female]: 'ok', [Gender.Male]: 123 },
        },
        { id: 'custom:3', name: '重复 id 被去重' },
      ],
    })
  )

  const loaded = loadAICustomTemplates()
  expect(loaded).toHaveLength(2)
  expect(loaded[0].id).toBe('custom:2')
  expect(loaded[0].prompts[Gender.Female]).toBe('')
  expect(loaded[0].prompts[Gender.Male]).toBe('')
  expect(loaded[1].id).toBe('custom:3')
  expect(loaded[1].prompts[Gender.Female]).toBe('ok')
  expect(loaded[1].prompts[Gender.Male]).toBe('')
})

test('returns empty list for corrupted storage content', () => {
  localStorage.setItem('vue-color-avatar:ai-custom-templates', 'not json')
  expect(loadAICustomTemplates()).toEqual([])

  localStorage.setItem(
    'vue-color-avatar:ai-custom-templates',
    JSON.stringify({ nope: true })
  )
  expect(loadAICustomTemplates()).toEqual([])
})

test('caps the number of persisted custom templates', () => {
  const templates = Array.from(
    { length: MAX_CUSTOM_TEMPLATE_COUNT + 5 },
    (_, i) => ({
      id: `custom:bulk-${i}`,
      name: `模板${i}`,
      prompts: { [Gender.Female]: 'a', [Gender.Male]: 'b' },
    })
  )

  saveAICustomTemplates(templates)
  expect(loadAICustomTemplates()).toHaveLength(MAX_CUSTOM_TEMPLATE_COUNT)
})
