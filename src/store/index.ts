import { defineStore } from 'pinia'

import { WrapperShape } from '@/enums'
import type { GeneratedImageRecord } from '@/services/ai-image'
import type { AvatarOption } from '@/types'
import { getRandomAvatarOption } from '@/utils'
import { SCREEN } from '@/utils/constant'

import {
  CLEAR_GENERATED_IMAGE,
  CLEAR_GENERATED_IMAGES,
  REDO,
  SET_AI_BATCH_MODAL_VISIBLE,
  SET_AVATAR_OPTION,
  SET_CURRENT_GENERATED_IMAGE,
  SET_EDITOR_MODE,
  SET_GENERATED_IMAGE,
  SET_GENERATED_IMAGES,
  SET_SIDER_STATUS,
  UNDO,
} from './mutation-type'

export type EditorMode = 'svg' | 'ai'

export interface State {
  history: {
    past: AvatarOption[]
    present: AvatarOption
    future: AvatarOption[]
  }
  isSiderCollapsed: boolean
  editorMode: EditorMode
  generatedImage: string
  generatedImages: string[]
  /** 每张生图对应的 prompt（key 为图片地址或 data URL） */
  generatedImagePrompts: Record<string, string>
  /** AI 模式撤销后可还原的图片在 generatedImages 中的下标 */
  generatedImageRedoStack: number[]
  /** AI 模板批量生成弹窗的开闭状态（顶部操作栏与侧栏共用） */
  aiBatchModalVisible: boolean
}

export const useStore = defineStore('store', {
  state: () =>
    ({
      history: {
        past: [],
        present: getRandomAvatarOption({ wrapperShape: WrapperShape.Squircle }),
        future: [],
      },
      isSiderCollapsed: window.innerWidth <= SCREEN.lg,
      editorMode: 'ai',
      generatedImage: '',
      generatedImages: [],
      generatedImagePrompts: {},
      generatedImageRedoStack: [],
      aiBatchModalVisible: false,
    } as State),
  actions: {
    [SET_AVATAR_OPTION](data: AvatarOption) {
      this.history = {
        past: [...this.history.past, this.history.present],
        present: data,
        future: [],
      }
      this.editorMode = 'svg'
      this.generatedImage = ''
    },

    [SET_EDITOR_MODE](mode: EditorMode) {
      this.editorMode = mode
    },

    [SET_GENERATED_IMAGE](image: string, prompt?: string) {
      this.editorMode = 'ai'
      this.generatedImage = image
      this.generatedImages.push(image)
      if (typeof prompt === 'string' && prompt.trim()) {
        this.generatedImagePrompts = {
          ...this.generatedImagePrompts,
          [image]: prompt.trim(),
        }
      }
      this.generatedImageRedoStack = []
    },

    [SET_GENERATED_IMAGES](images: GeneratedImageRecord[]) {
      // 批量载入服务器端保存的历史（旧 → 新），不切换编辑模式
      this.generatedImages = images.map((record) => record.url)
      this.generatedImagePrompts = images.reduce<Record<string, string>>(
        (prompts, record) => {
          if (record.prompt) prompts[record.url] = record.prompt
          return prompts
        },
        {}
      )
    },

    [SET_CURRENT_GENERATED_IMAGE](image: string) {
      this.editorMode = 'ai'
      this.generatedImage = image
      this.generatedImageRedoStack = []
    },

    [CLEAR_GENERATED_IMAGE]() {
      this.editorMode = 'svg'
      this.generatedImage = ''
    },

    [CLEAR_GENERATED_IMAGES]() {
      this.generatedImages = []
      this.generatedImagePrompts = {}
      this.generatedImageRedoStack = []
    },

    [UNDO]() {
      // AI 模式下撤销是在生成历史中回退一张，不切换编辑模式
      if (this.editorMode === 'ai') {
        const index = this.generatedImages.indexOf(this.generatedImage)
        if (index > 0) {
          this.generatedImageRedoStack = [
            ...this.generatedImageRedoStack,
            index,
          ]
          this.generatedImage = this.generatedImages[index - 1]
        }
        return
      }

      if (this.history.past.length > 0) {
        const previous = this.history.past[this.history.past.length - 1]
        const newPast = this.history.past.slice(0, -1)
        this.history = {
          past: newPast,
          present: previous,
          future: [this.history.present, ...this.history.future],
        }
      }
    },

    [REDO]() {
      // AI 模式下还原是重新显示刚撤销的生成图片，不切换编辑模式
      if (this.editorMode === 'ai') {
        if (this.generatedImageRedoStack.length > 0) {
          const index =
            this.generatedImageRedoStack[
              this.generatedImageRedoStack.length - 1
            ]
          this.generatedImageRedoStack = this.generatedImageRedoStack.slice(
            0,
            -1
          )
          this.generatedImage = this.generatedImages[index]
        }
        return
      }

      if (this.history.future.length > 0) {
        const next = this.history.future[0]
        const newFuture = this.history.future.slice(1)
        this.history = {
          past: [...this.history.past, this.history.present],
          present: next,
          future: newFuture,
        }
      }
    },

    [SET_SIDER_STATUS](collapsed: boolean) {
      if (collapsed !== this.isSiderCollapsed) {
        this.isSiderCollapsed = collapsed
      }
    },

    [SET_AI_BATCH_MODAL_VISIBLE](visible: boolean) {
      this.aiBatchModalVisible = visible
    },
  },
})
