import { Gender } from '@/enums'

const GENERATE_API_URL = '/avatar/api/generate'
const MAX_SOURCE_FILE_SIZE = 10 * 1024 * 1024
const MAX_IMAGE_SIDE = 1600

export const MAX_AI_PROMPT_LENGTH = 2000
export const AI_GENDERS = [Gender.Female, Gender.Male] as const
export const AI_PROMPT_TEMPLATE_IDS = ['cute', 'cool', 'traditional'] as const

export type AIGender = (typeof AI_GENDERS)[number]
export type AIPromptTemplateId = (typeof AI_PROMPT_TEMPLATE_IDS)[number]
export type AIPromptDrafts = Record<
  AIGender,
  Record<AIPromptTemplateId, string>
>

const COMMON_PROMPT_SUFFIX =
  '严格保留参考图角色的头部轮廓、耳朵、肤色、黑色椭圆眼睛、五官比例和手绘线条风格。主体居中，完整呈现在正方形画布内，不要手机界面、状态栏、黑边、文字或水印。'

export const AI_PROMPT_TEMPLATES: Readonly<AIPromptDrafts> = {
  [Gender.Female]: {
    cute: `生成完整的可爱 Q 版女孩头像。添加黑色厚刘海双马尾、蓝色发夹、粉色爱心装饰和蓝色蝴蝶结，白色背景配柔和彩色手绘涂鸦。${COMMON_PROMPT_SUFFIX}`,
    cool: `生成完整的酷飒 Q 版女孩头像。添加黑色高马尾和有层次感的长刘海，搭配深色潮流夹克、简洁金属耳饰与个性发夹，背景使用深色霓虹和彩色街头涂鸦。${COMMON_PROMPT_SUFFIX}`,
    traditional: `生成完整的国风 Q 版女孩头像。添加精致古风发髻、发簪与轻盈流苏，搭配雅致汉服领口和传统纹样，背景使用淡雅水墨花卉与柔和云纹。${COMMON_PROMPT_SUFFIX}`,
  },
  [Gender.Male]: {
    cute: `生成完整的可爱 Q 版男孩头像。添加蓬松自然的黑色短发、清爽衬衫和小领结，搭配简洁可爱的小型配饰，白色背景配柔和彩色手绘涂鸦。${COMMON_PROMPT_SUFFIX}`,
    cool: `生成完整的酷飒 Q 版男孩头像。添加利落有层次的黑色短发，搭配深色街头夹克、简洁耳饰和潮流配件，背景使用深色霓虹与彩色街头涂鸦。${COMMON_PROMPT_SUFFIX}`,
    traditional: `生成完整的国风 Q 版男孩头像。添加古风束发与精致发冠，搭配汉服交领、玉佩或流苏配饰，背景使用淡雅水墨山水、竹叶与云纹。${COMMON_PROMPT_SUFFIX}`,
  },
}

export const DEFAULT_AI_GENDER: AIGender = Gender.Female
export const DEFAULT_AI_TEMPLATE_ID: AIPromptTemplateId = 'cute'
export const DEFAULT_AI_PROMPT =
  AI_PROMPT_TEMPLATES[DEFAULT_AI_GENDER][DEFAULT_AI_TEMPLATE_ID]

export function createAIPromptDrafts(): AIPromptDrafts {
  return {
    [Gender.Female]: { ...AI_PROMPT_TEMPLATES[Gender.Female] },
    [Gender.Male]: { ...AI_PROMPT_TEMPLATES[Gender.Male] },
  }
}

export type AIImageErrorCode =
  | 'invalid_file'
  | 'file_too_large'
  | 'image_load_failed'
  | 'invalid_prompt'
  | 'api_key_missing'
  | 'violation'
  | 'network_error'
  | 'timeout'
  | 'generate_failed'

export class AIImageError extends Error {
  code: AIImageErrorCode

  constructor(code: AIImageErrorCode, message?: string) {
    super(message || code)
    this.name = 'AIImageError'
    this.code = code
  }
}

interface GenerateResponse {
  image?: string
  error?: {
    code?: string
    message?: string
  }
}

function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new AIImageError('image_load_failed'))
    reader.readAsDataURL(file)
  })
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new AIImageError('image_load_failed'))
    image.src = source
  })
}

async function processImageSource(source: string) {
  const image = await loadImage(source)
  const scale = Math.min(
    1,
    MAX_IMAGE_SIDE / Math.max(image.width, image.height)
  )
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new AIImageError('image_load_failed')
  }

  canvas.width = width
  canvas.height = height
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', 0.9)
}

export async function prepareReferenceImage(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new AIImageError('invalid_file')
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    throw new AIImageError('file_too_large')
  }

  const source = await readFileAsDataURL(file)
  return processImageSource(source)
}

/** 将默认底模等内置参考图资源处理为可用于生成的 data URL */
export async function prepareReferenceImageFromUrl(url: string) {
  return processImageSource(url)
}

function normalizeErrorCode(code?: string): AIImageErrorCode {
  switch (code) {
    case 'SERVICE_NOT_CONFIGURED':
      return 'api_key_missing'
    case 'CONTENT_VIOLATION':
      return 'violation'
    case 'INVALID_PROMPT':
      return 'invalid_prompt'
    case 'UPSTREAM_TIMEOUT':
      return 'timeout'
    default:
      return 'generate_failed'
  }
}

export async function generateAIImage(image: string, prompt: string) {
  const normalizedPrompt = prompt.trim()
  if (!normalizedPrompt) {
    throw new AIImageError('invalid_prompt')
  }

  let response: Response
  try {
    response = await fetch(GENERATE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image, prompt: normalizedPrompt }),
    })
  } catch {
    throw new AIImageError('network_error')
  }

  let result: GenerateResponse
  try {
    result = (await response.json()) as GenerateResponse
  } catch {
    throw new AIImageError('generate_failed')
  }

  if (!response.ok || !result.image) {
    throw new AIImageError(
      normalizeErrorCode(result.error?.code),
      result.error?.message
    )
  }

  return result.image
}
