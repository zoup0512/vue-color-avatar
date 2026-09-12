const {
  AdapterError,
  MAX_IMAGE_BYTES,
  bufferToDataUrl,
  buildUpstreamPayload,
  isJsonContentType,
  parseUpstreamResult,
  validateDownloadUrl,
  validateGenerateInput,
} = require('../grsai.cjs')

function expectAdapterError(fn, statusCode, code) {
  expect(fn).toThrow(AdapterError)
  try {
    fn()
  } catch (error) {
    expect(error).toMatchObject({ statusCode, code })
  }
}

describe('request validation', () => {
  const image = 'data:image/png;base64,aGVsbG8='

  test('accepts and normalizes valid input', () => {
    expect(validateGenerateInput({ image, prompt: '  redraw this  ' })).toEqual({
      image,
      prompt: 'redraw this',
    })
  })

  test('recognizes JSON content types', () => {
    expect(isJsonContentType('application/json')).toBe(true)
    expect(isJsonContentType('application/json; charset=utf-8')).toBe(true)
    expect(isJsonContentType('text/plain')).toBe(false)
    expect(isJsonContentType()).toBe(false)
  })

  test.each([
    [null, 'INVALID_BODY'],
    [{ image, prompt: '' }, 'INVALID_PROMPT'],
    [{ image, prompt: 3 }, 'INVALID_PROMPT'],
    [{ image: 'https://example.com/image.png', prompt: 'redraw' }, 'INVALID_IMAGE'],
    [{ image: 'data:text/plain;base64,aGVsbG8=', prompt: 'redraw' }, 'INVALID_IMAGE'],
    [{ image: 'data:image/png;base64,not-valid', prompt: 'redraw' }, 'INVALID_IMAGE'],
  ])('rejects invalid input %#', (input, code) => {
    expectAdapterError(() => validateGenerateInput(input), 400, code)
  })

  test('rejects decoded images over the limit', () => {
    const oversized = `data:image/png;base64,${Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64')}`
    expectAdapterError(() => validateGenerateInput({ image: oversized, prompt: 'redraw' }), 413, 'IMAGE_TOO_LARGE')
  })
})

describe('upstream payload', () => {
  test('uses the fixed Grsai model and options', () => {
    expect(buildUpstreamPayload({ image: 'data:image/png;base64,AA==', prompt: 'redraw' })).toEqual({
      model: 'gpt-image-2.5',
      prompt: 'redraw',
      images: ['data:image/png;base64,AA=='],
      aspectRatio: '1024x1024',
      replyType: 'json',
    })
  })
})

describe('upstream result parsing', () => {
  test('extracts the first result and task ID', () => {
    expect(
      parseUpstreamResult(200, {
        status: 'success',
        taskId: 'task-123',
        results: [{ url: 'https://cdn.example.com/result.png' }],
      })
    ).toEqual({
      imageUrl: 'https://cdn.example.com/result.png',
      taskId: 'task-123',
    })
  })

  test('supports result data nested under data', () => {
    expect(
      parseUpstreamResult(200, {
        data: {
          status: 'success',
          task_id: 42,
          results: [{ url: 'https://cdn.example.com/result.png' }],
        },
      })
    ).toEqual({
      imageUrl: 'https://cdn.example.com/result.png',
      taskId: '42',
    })
  })

  test.each([
    [429, { message: 'rate limited' }, 502, 'UPSTREAM_ERROR'],
    [200, { status: 'failed', results: [] }, 502, 'GENERATION_FAILED'],
    [200, { status: 'violation', results: [] }, 422, 'CONTENT_VIOLATION'],
    [200, { status: 'success', results: [] }, 502, 'MISSING_RESULT'],
    [200, null, 502, 'INVALID_UPSTREAM_RESPONSE'],
  ])('normalizes invalid response %#', (status, payload, expectedStatus, code) => {
    expectAdapterError(() => parseUpstreamResult(status, payload), expectedStatus, code)
  })
})

describe('download result handling', () => {
  test('converts an image buffer to a data URL', () => {
    expect(bufferToDataUrl(Buffer.from('image'), 'image/png; charset=binary')).toBe(
      'data:image/png;base64,aW1hZ2U='
    )
  })

  test('rejects non-image download content', () => {
    expectAdapterError(
      () => bufferToDataUrl(Buffer.from('<html>'), 'text/html'),
      502,
      'INVALID_IMAGE_DOWNLOAD'
    )
  })

  test('accepts public HTTPS result URLs', () => {
    expect(validateDownloadUrl('https://cdn.example.com/image.png').href).toBe(
      'https://cdn.example.com/image.png'
    )
  })

  test.each([
    'http://cdn.example.com/image.png',
    'https://localhost/image.png',
    'https://127.0.0.1/image.png',
    'https://10.0.0.1/image.png',
    'https://192.168.1.2/image.png',
    'https://[::1]/image.png',
    'https://[fc00::1]/image.png',
    'https://[fe80::1]/image.png',
    'not a url',
  ])('rejects unsafe result URL %s', (url) => {
    expectAdapterError(() => validateDownloadUrl(url), 502, 'INVALID_RESULT_URL')
  })
})
