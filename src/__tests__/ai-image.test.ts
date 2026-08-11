import { Gender } from '../enums'
import {
  AI_GENDERS,
  AI_PROMPT_TEMPLATE_IDS,
  AI_PROMPT_TEMPLATES,
  createAIPromptDrafts,
  DEFAULT_AI_GENDER,
  DEFAULT_AI_PROMPT,
  DEFAULT_AI_TEMPLATE_ID,
  MAX_AI_PROMPT_LENGTH,
} from '../services/ai-image'

test('defines three prompt templates for each AI gender', () => {
  expect(AI_GENDERS).toEqual([Gender.Female, Gender.Male])
  expect(AI_PROMPT_TEMPLATE_IDS).toEqual(['cute', 'cool', 'traditional'])

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
