import { defineStore } from 'pinia'

import { WrapperShape } from '@/enums'
import type { AvatarOption } from '@/types'
import { getRandomAvatarOption } from '@/utils'
import { SCREEN } from '@/utils/constant'

import {
  CLEAR_GENERATED_IMAGE,
  REDO,
  SET_AVATAR_OPTION,
  SET_EDITOR_MODE,
  SET_GENERATED_IMAGE,
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
      editorMode: 'svg',
      generatedImage: '',
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

    [SET_GENERATED_IMAGE](image: string) {
      this.editorMode = 'ai'
      this.generatedImage = image
    },

    [CLEAR_GENERATED_IMAGE]() {
      this.editorMode = 'svg'
      this.generatedImage = ''
    },

    [UNDO]() {
      this.editorMode = 'svg'
      this.generatedImage = ''

      if (this.history.past.length > 0) {
        const previous = this.history.past[this.history.past.length - 1]
        const newPast = this.history.past.slice(0, this.history.past.length - 1)
        this.history = {
          past: newPast,
          present: previous,
          future: [this.history.present, ...this.history.future],
        }
      }
    },

    [REDO]() {
      this.editorMode = 'svg'
      this.generatedImage = ''

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
  },
})
