import { createPinia, setActivePinia } from 'pinia'

import { useStore } from '../store'
import {
  CLEAR_GENERATED_IMAGE,
  SET_AVATAR_OPTION,
  SET_EDITOR_MODE,
  SET_GENERATED_IMAGE,
} from '../store/mutation-type'

describe('editor mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('starts in SVG mode', () => {
    expect(useStore().editorMode).toBe('svg')
  })

  test('keeps the generated image when switching tabs', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=')
    store[SET_EDITOR_MODE]('svg')

    expect(store.editorMode).toBe('svg')
    expect(store.generatedImage).toBe('data:image/png;base64,aW1hZ2U=')

    store[SET_EDITOR_MODE]('ai')
    expect(store.editorMode).toBe('ai')
  })

  test('SVG edits clear the generated image', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=')
    store[SET_AVATAR_OPTION]({
      ...store.history.present,
      background: {
        ...store.history.present.background,
        color: '#fff',
      },
    })

    expect(store.editorMode).toBe('svg')
    expect(store.generatedImage).toBe('')
  })

  test('clearing the generated image returns to SVG mode', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=')
    store[CLEAR_GENERATED_IMAGE]()

    expect(store.editorMode).toBe('svg')
    expect(store.generatedImage).toBe('')
  })
})
