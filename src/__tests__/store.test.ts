import { createPinia, setActivePinia } from 'pinia'

import { useStore } from '../store'
import {
  CLEAR_GENERATED_IMAGE,
  CLEAR_GENERATED_IMAGES,
  SET_AVATAR_OPTION,
  SET_CURRENT_GENERATED_IMAGE,
  SET_EDITOR_MODE,
  SET_GENERATED_IMAGE,
  SET_GENERATED_IMAGES,
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

describe('generated image history', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('keeps every generated image in order', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=')
    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U2=')
    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2Uz=')

    expect(store.generatedImages).toEqual([
      'data:image/png;base64,aW1hZ2U=',
      'data:image/png;base64,aW1hZ2U2=',
      'data:image/png;base64,aW1hZ2Uz=',
    ])
    expect(store.generatedImage).toBe('data:image/png;base64,aW1hZ2Uz=')
  })

  test('switching to a history image does not append to history', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=')
    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U2=')
    store[SET_CURRENT_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=')

    expect(store.generatedImage).toBe('data:image/png;base64,aW1hZ2U=')
    expect(store.generatedImages).toHaveLength(2)
    expect(store.editorMode).toBe('ai')
  })

  test('clearing the history keeps the current image and mode', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=')
    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U2=')
    store[CLEAR_GENERATED_IMAGES]()

    expect(store.generatedImages).toEqual([])
    expect(store.generatedImage).toBe('data:image/png;base64,aW1hZ2U2=')
    expect(store.editorMode).toBe('ai')
  })

  test('bulk loading the server history does not change the mode', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGES]([
      '/avatar/api/history/files/20260813/20260813_153045_ab12.png',
      '/avatar/api/history/files/20260814/20260814_093021_cd34.png',
    ])

    expect(store.generatedImages).toEqual([
      '/avatar/api/history/files/20260813/20260813_153045_ab12.png',
      '/avatar/api/history/files/20260814/20260814_093021_cd34.png',
    ])
    expect(store.editorMode).toBe('svg')
    expect(store.generatedImage).toBe('')
  })
})
