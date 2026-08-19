import { createPinia, setActivePinia } from 'pinia'

import { useStore } from '../store'
import {
  CLEAR_GENERATED_IMAGE,
  CLEAR_GENERATED_IMAGES,
  REDO,
  SET_AVATAR_OPTION,
  SET_CURRENT_GENERATED_IMAGE,
  SET_EDITOR_MODE,
  SET_GENERATED_IMAGE,
  SET_GENERATED_IMAGES,
  UNDO,
} from '../store/mutation-type'

describe('editor mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('starts in AI mode', () => {
    expect(useStore().editorMode).toBe('ai')
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

  test('records the prompt of each generated image', () => {
    const store = useStore()

    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U=', '可爱女孩')
    store[SET_GENERATED_IMAGE]('data:image/png;base64,aW1hZ2U2=')
    store[SET_GENERATED_IMAGE](
      'data:image/png;base64,aW1hZ2Uz=',
      '  酷飒男孩  '
    )

    expect(store.generatedImagePrompts).toEqual({
      'data:image/png;base64,aW1hZ2U=': '可爱女孩',
      'data:image/png;base64,aW1hZ2Uz=': '酷飒男孩',
    })

    store[CLEAR_GENERATED_IMAGES]()
    expect(store.generatedImagePrompts).toEqual({})
  })

  test('bulk loading the server history does not change the mode', () => {
    const store = useStore()

    store[SET_EDITOR_MODE]('svg')
    store[SET_GENERATED_IMAGES]([
      {
        url: '/avatar/api/history/files/20260813/20260813_153045_ab12.png',
        prompt: '可爱女孩',
      },
      {
        url: '/avatar/api/history/files/20260814/20260814_093021_cd34.png',
        prompt: '',
      },
    ])

    expect(store.generatedImages).toEqual([
      '/avatar/api/history/files/20260813/20260813_153045_ab12.png',
      '/avatar/api/history/files/20260814/20260814_093021_cd34.png',
    ])
    expect(store.generatedImagePrompts).toEqual({
      '/avatar/api/history/files/20260813/20260813_153045_ab12.png': '可爱女孩',
    })
    expect(store.editorMode).toBe('svg')
    expect(store.generatedImage).toBe('')
  })
})

describe('AI mode undo/redo', () => {
  const IMAGE_A = 'data:image/png;base64,aW1hZ2U='
  const IMAGE_B = 'data:image/png;base64,aW1hZ2Uy='
  const IMAGE_C = 'data:image/png;base64,aW1hZ2Uz='

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function generateThreeImages() {
    const store = useStore()
    store[SET_GENERATED_IMAGE](IMAGE_A)
    store[SET_GENERATED_IMAGE](IMAGE_B)
    store[SET_GENERATED_IMAGE](IMAGE_C)
    return store
  }

  test('undo steps back through generated images and stays in AI mode', () => {
    const store = generateThreeImages()

    store[UNDO]()

    expect(store.generatedImage).toBe(IMAGE_B)
    expect(store.editorMode).toBe('ai')
  })

  test('redo restores the undone image', () => {
    const store = generateThreeImages()

    store[UNDO]()
    store[REDO]()

    expect(store.generatedImage).toBe(IMAGE_C)
    expect(store.editorMode).toBe('ai')
  })

  test('undo is a no-op at the oldest image', () => {
    const store = generateThreeImages()

    store[UNDO]()
    store[UNDO]()
    store[UNDO]()

    expect(store.generatedImage).toBe(IMAGE_A)
  })

  test('generating a new image after undo clears the redo stack', () => {
    const store = generateThreeImages()

    store[UNDO]()
    store[UNDO]()
    store[SET_GENERATED_IMAGE]('data:image/png;base64,bmV3')
    store[REDO]()

    expect(store.generatedImage).toBe('data:image/png;base64,bmV3')
  })

  test('selecting an image from the panel clears the redo stack', () => {
    const store = generateThreeImages()

    store[UNDO]()
    store[SET_CURRENT_GENERATED_IMAGE](IMAGE_C)
    store[REDO]()

    expect(store.generatedImage).toBe(IMAGE_C)
  })

  test('clearing the history resets the redo stack', () => {
    const store = generateThreeImages()

    store[UNDO]()
    store[CLEAR_GENERATED_IMAGES]()
    store[REDO]()

    expect(store.generatedImage).toBe(IMAGE_B)
  })

  test('SVG mode undo still works on avatar options without switching modes', () => {
    const store = useStore()
    const present = store.history.present
    const edited = {
      ...present,
      background: { ...present.background, color: '#fff' },
    }

    store[SET_AVATAR_OPTION](edited)
    store[SET_EDITOR_MODE]('ai')
    store[SET_EDITOR_MODE]('svg')
    store[UNDO]()

    expect(store.history.present).toEqual(present)
    expect(store.editorMode).toBe('svg')

    store[REDO]()
    expect(store.history.present).toEqual(edited)
    expect(store.editorMode).toBe('svg')
  })
})
