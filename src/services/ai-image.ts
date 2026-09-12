import { Gender } from '@/enums'

const GENERATE_API_URL = '/avatar/api/generate'
const HISTORY_API_URL = '/avatar/api/history'
const MAX_SOURCE_FILE_SIZE = 10 * 1024 * 1024
const MAX_IMAGE_SIDE = 1600

export const MAX_AI_PROMPT_LENGTH = 2000
export const AI_GENDERS = [Gender.Female, Gender.Male] as const
export const AI_PROMPT_TEMPLATE_IDS = [
  'cute',
  'cool',
  'traditional',
  'fairy',
  'cyberpunk',
  'retro',
  'sporty',
  'idol',
  'campus',
] as const

export type AIGender = (typeof AI_GENDERS)[number]
export type AIPromptTemplateId = (typeof AI_PROMPT_TEMPLATE_IDS)[number]
/** 内置或自定义模板的 id（自定义模板以 CUSTOM_TEMPLATE_ID_PREFIX 开头） */
export type AITemplateId = string
export type AIPromptDrafts = Record<AIGender, Record<AITemplateId, string>>

const COMMON_PROMPT_SUFFIX =
  '严格保留参考图角色的头部轮廓、耳朵、肤色、黑色椭圆眼睛、五官比例和手绘线条风格。主体居中，完整呈现在正方形画布内，不要手机界面、状态栏、黑边、文字或水印。'

export const AI_PROMPT_TEMPLATES: Readonly<
  Record<AIGender, Record<AIPromptTemplateId, string>>
> = {
  [Gender.Female]: {
    cute: `生成完整的可爱 Q 版女孩头像。添加黑色厚刘海双马尾、蓝色发夹、粉色爱心装饰和蓝色蝴蝶结，白色背景配柔和彩色手绘涂鸦。${COMMON_PROMPT_SUFFIX}`,
    cool: `生成完整的酷飒 Q 版女孩头像。添加黑色高马尾和有层次感的长刘海，搭配深色潮流夹克、简洁金属耳饰与个性发夹，背景使用深色霓虹和彩色街头涂鸦。${COMMON_PROMPT_SUFFIX}`,
    traditional: `生成完整的国风 Q 版女孩头像。添加精致古风发髻、发簪与轻盈流苏，搭配雅致汉服领口和传统纹样，背景使用淡雅水墨花卉与柔和云纹。${COMMON_PROMPT_SUFFIX}`,
    fairy: `生成完整的仙气 Q 版女孩头像。添加柔顺微卷长发、精致花环头饰和闪烁星点发饰，搭配轻盈纱裙、蝴蝶翅膀元素与珍珠配饰，背景使用梦幻淡紫粉渐变、柔和星光与飘渺云雾。${COMMON_PROMPT_SUFFIX}`,
    cyberpunk: `生成完整的赛博朋克 Q 版女孩头像。添加黑紫渐变双色调短发、发光电路发卡和科技感耳饰，搭配机能风夹克与 LED 发光配件，背景使用深蓝紫霓虹、全息投影线条和雨夜反光。${COMMON_PROMPT_SUFFIX}`,
    retro: `生成完整的复古 Q 版女孩头像。添加复古波浪卷发、丝带发箍和珍珠耳环，搭配波点连衣裙、复古翻领和怀表项链，背景使用暖黄做旧色调、老式磁带和胶片元素。${COMMON_PROMPT_SUFFIX}`,
    sporty: `生成完整的活力运动 Q 版女孩头像。添加高丸子头、运动发带和利落碎发，搭配亮色运动外套、运动 T 恤和小护腕，背景使用明快撞色色块、速度线条和运动图标涂鸦。${COMMON_PROMPT_SUFFIX}`,
    idol: `生成完整的偶像 Q 版女孩头像。添加精致双马尾或大波浪卷发、闪亮星形发卡和华丽发饰，搭配舞台演出服、亮片装饰和手持麦克风，背景使用舞台聚光灯、彩色光斑和欢呼彩带。${COMMON_PROMPT_SUFFIX}`,
    campus: `生成完整的学院风 Q 版女孩头像。添加齐肩短发或双麻花辫、甜美蝴蝶结发饰，搭配海军领制服、针织背心和领结，背景使用清新浅色格纹、书本铅笔和校园元素涂鸦。${COMMON_PROMPT_SUFFIX}`,
  },
  [Gender.Male]: {
    cute: `生成完整的可爱 Q 版男孩头像。添加蓬松自然的黑色短发、清爽衬衫和小领结，搭配简洁可爱的小型配饰，白色背景配柔和彩色手绘涂鸦。${COMMON_PROMPT_SUFFIX}`,
    cool: `生成完整的酷飒 Q 版男孩头像。添加利落有层次的黑色短发，搭配深色街头夹克、简洁耳饰和潮流配件，背景使用深色霓虹与彩色街头涂鸦。${COMMON_PROMPT_SUFFIX}`,
    traditional: `生成完整的国风 Q 版男孩头像。添加古风束发与精致发冠，搭配汉服交领、玉佩或流苏配饰，背景使用淡雅水墨山水、竹叶与云纹。${COMMON_PROMPT_SUFFIX}`,
    fairy: `生成完整的仙气 Q 版男孩头像。添加柔顺黑色长发或半束发、精致银色发饰，搭配素雅长袍、轻纱披风和月光石配饰，背景使用梦幻淡蓝渐变、柔和星光与飘渺云雾。${COMMON_PROMPT_SUFFIX}`,
    cyberpunk: `生成完整的赛博朋克 Q 版男孩头像。添加黑紫渐变双色调短发、发光电路发夹和科技护目镜，搭配机能风外套与 LED 徽章，背景使用深蓝紫霓虹、全息投影线条和雨夜反光。${COMMON_PROMPT_SUFFIX}`,
    retro: `生成完整的复古 Q 版男孩头像。添加复古油头微卷短发、鸭舌帽和圆框眼镜，搭配格纹西装马甲、蝴蝶结领结和怀表，背景使用暖黄做旧色调、老式收音机和胶片元素。${COMMON_PROMPT_SUFFIX}`,
    sporty: `生成完整的活力运动 Q 版男孩头像。添加利落黑色短发、运动发带和干练碎发，搭配篮球背心、运动外套和护腕，背景使用明快撞色色块、速度线条和运动图标涂鸦。${COMMON_PROMPT_SUFFIX}`,
    idol: `生成完整的偶像 Q 版男孩头像。添加时尚纹理烫发、闪亮耳饰和精致眉钉，搭配舞台演出服、亮片外套和手持麦克风，背景使用舞台聚光灯、彩色光斑和欢呼彩带。${COMMON_PROMPT_SUFFIX}`,
    campus: `生成完整的学院风 Q 版男孩头像。添加清爽黑色短发和简约发夹，搭配海军领制服、针织开衫和斜条纹领带，背景使用清新浅色格纹、书本篮球和校园元素涂鸦。${COMMON_PROMPT_SUFFIX}`,
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

// ---------------------------------------------------------------------------
// 自定义模板：保存在浏览器 localStorage，按性别维护各自的生成要求
// ---------------------------------------------------------------------------

export const CUSTOM_TEMPLATE_ID_PREFIX = 'custom:'
export const MAX_CUSTOM_TEMPLATE_COUNT = 20
export const MAX_CUSTOM_TEMPLATE_NAME_LENGTH = 12

const CUSTOM_TEMPLATES_STORAGE_KEY = 'vue-color-avatar:ai-custom-templates'

export interface AICustomTemplate {
  id: string
  name: string
  prompts: Record<AIGender, string>
}

/** 模板选择列表（含内置与自定义）中使用的一项 */
export interface AITemplateOption {
  id: string
  name: string
  custom: boolean
}

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith(CUSTOM_TEMPLATE_ID_PREFIX)
}

export function createCustomTemplateId(): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${CUSTOM_TEMPLATE_ID_PREFIX}${Date.now().toString(36)}-${random}`
}

function sanitizeCustomTemplate(value: unknown): AICustomTemplate | null {
  if (!value || typeof value !== 'object') return null

  const raw = value as Record<string, unknown>
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!id.startsWith(CUSTOM_TEMPLATE_ID_PREFIX) || !name) return null

  const rawPrompts =
    raw.prompts && typeof raw.prompts === 'object'
      ? (raw.prompts as Record<string, unknown>)
      : {}
  const prompts = {} as Record<AIGender, string>
  for (const gender of AI_GENDERS) {
    const prompt = rawPrompts[gender]
    prompts[gender] =
      typeof prompt === 'string' ? prompt.slice(0, MAX_AI_PROMPT_LENGTH) : ''
  }

  return {
    id,
    name: name.slice(0, MAX_CUSTOM_TEMPLATE_NAME_LENGTH),
    prompts,
  }
}

/** 读取 localStorage 中的自定义模板；损坏数据会被过滤，失败时返回空列表 */
export function loadAICustomTemplates(): AICustomTemplate[] {
  if (typeof localStorage === 'undefined') return []

  let parsed: unknown
  try {
    parsed = JSON.parse(
      localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY) ?? ''
    )
  } catch {
    return []
  }

  if (!parsed || typeof parsed !== 'object') return []
  const rawList = (parsed as { templates?: unknown }).templates
  if (!Array.isArray(rawList)) return []

  const templates: AICustomTemplate[] = []
  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  for (const item of rawList) {
    const template = sanitizeCustomTemplate(item)
    const nameKey = template?.name.trim()
    if (
      !template ||
      seenIds.has(template.id) ||
      (nameKey && seenNames.has(nameKey))
    ) {
      continue
    }
    seenIds.add(template.id)
    if (nameKey) seenNames.add(nameKey)
    templates.push(template)
    if (templates.length >= MAX_CUSTOM_TEMPLATE_COUNT) break
  }

  return templates
}

/** 将自定义模板写入 localStorage；写入失败（如隐私模式）时静默忽略 */
export function saveAICustomTemplates(templates: AICustomTemplate[]): void {
  if (typeof localStorage === 'undefined') return

  try {
    const safeList = templates
      .slice(0, MAX_CUSTOM_TEMPLATE_COUNT)
      .filter((template) => sanitizeCustomTemplate(template) !== null)
      .map((template) => sanitizeCustomTemplate(template) as AICustomTemplate)
    localStorage.setItem(
      CUSTOM_TEMPLATES_STORAGE_KEY,
      JSON.stringify({ version: 1, templates: safeList })
    )
  } catch {
    // 存储不可用时忽略，自定义模板仅在本会话内生效
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
  if (!normalizedPrompt || normalizedPrompt.length > MAX_AI_PROMPT_LENGTH) {
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

/** 一张历史生图的记录：图片地址与生成它时使用的 prompt */
export interface GeneratedImageRecord {
  url: string
  prompt: string
}

function parseHistoryImages(raw: unknown): GeneratedImageRecord[] {
  if (!Array.isArray(raw)) return []

  const records: GeneratedImageRecord[] = []
  for (const item of raw) {
    // 兼容旧版服务端返回的纯 URL 数组（无 prompt）
    if (typeof item === 'string') {
      records.push({ url: item, prompt: '' })
    } else if (
      item &&
      typeof item === 'object' &&
      typeof (item as { url?: unknown }).url === 'string'
    ) {
      const record = item as { url: string; prompt?: unknown }
      records.push({
        url: record.url,
        prompt: typeof record.prompt === 'string' ? record.prompt : '',
      })
    }
  }
  return records
}

/** 拉取服务器端保存的生图历史（最新在前）；失败时静默返回空列表 */
export async function loadGeneratedImageHistory(): Promise<
  GeneratedImageRecord[]
> {
  try {
    const response = await fetch(HISTORY_API_URL)
    if (!response.ok) return []

    const result = (await response.json()) as { images?: unknown }
    return parseHistoryImages(result.images)
  } catch {
    return []
  }
}

/** 删除服务器端全部生图历史；成功返回 true */
export async function clearGeneratedImageHistory(): Promise<boolean> {
  try {
    const response = await fetch(HISTORY_API_URL, { method: 'DELETE' })
    return response.ok
  } catch {
    return false
  }
}
