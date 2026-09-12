'use strict'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_PROMPT_LENGTH = 2000
const UPSTREAM_URL = 'https://grsai.dakka.com.cn/v1/api/generate'

class AdapterError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.name = 'AdapterError'
    this.statusCode = statusCode
    this.code = code
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isJsonContentType(contentType) {
  if (typeof contentType !== 'string') return false
  return /^application\/json(?:\s*;|\s*$)/i.test(contentType)
}

function validateGenerateInput(value) {
  if (!isPlainObject(value)) {
    throw new AdapterError(400, 'INVALID_BODY', 'Request body must be a JSON object')
  }

  const { image, prompt } = value

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new AdapterError(400, 'INVALID_PROMPT', 'Prompt must be a non-empty string')
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new AdapterError(
      400,
      'INVALID_PROMPT',
      `Prompt must not exceed ${MAX_PROMPT_LENGTH} characters`
    )
  }

  if (typeof image !== 'string') {
    throw new AdapterError(400, 'INVALID_IMAGE', 'Image must be a data URL')
  }

  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/]+={0,2})$/i.exec(image)
  if (!match || match[2].length % 4 !== 0) {
    throw new AdapterError(400, 'INVALID_IMAGE', 'Image must be a valid base64 data URL')
  }

  const encoded = match[2]
  const decoded = Buffer.from(encoded, 'base64')
  if (
    decoded.length === 0 ||
    decoded.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')
  ) {
    throw new AdapterError(400, 'INVALID_IMAGE', 'Image must be a valid base64 data URL')
  }

  if (decoded.length > MAX_IMAGE_BYTES) {
    throw new AdapterError(
      413,
      'IMAGE_TOO_LARGE',
      `Image must not exceed ${MAX_IMAGE_BYTES} bytes`
    )
  }

  return { image, prompt: prompt.trim() }
}

function buildUpstreamPayload({ image, prompt }) {
  return {
    model: 'gpt-image-2.5',
    prompt,
    images: [image],
    aspectRatio: '1024x1024',
    replyType: 'json',
  }
}

function parseUpstreamResult(statusCode, payload) {
  if (statusCode < 200 || statusCode >= 300) {
    throw new AdapterError(502, 'UPSTREAM_ERROR', 'Image generation service returned an error')
  }

  if (!isPlainObject(payload)) {
    throw new AdapterError(502, 'INVALID_UPSTREAM_RESPONSE', 'Image generation service returned invalid data')
  }

  const data = isPlainObject(payload.data) ? payload.data : payload
  const status = String(data.status ?? payload.status ?? '').toLowerCase()

  if (status === 'violation') {
    throw new AdapterError(422, 'CONTENT_VIOLATION', 'The request was rejected by content policy')
  }

  if (status === 'failed') {
    throw new AdapterError(502, 'GENERATION_FAILED', 'Image generation failed')
  }

  const results = Array.isArray(data.results) ? data.results : payload.results
  const imageUrl = results?.[0]?.url
  if (typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
    throw new AdapterError(502, 'MISSING_RESULT', 'Image generation returned no image')
  }

  const taskId = data.taskId ?? data.task_id ?? data.id ?? payload.taskId ?? payload.task_id ?? payload.id
  return {
    imageUrl: imageUrl.trim(),
    taskId: taskId == null ? null : String(taskId),
  }
}

function bufferToDataUrl(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AdapterError(502, 'INVALID_IMAGE_DOWNLOAD', 'Downloaded image was empty')
  }

  const mimeType = String(contentType || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
  if (!/^image\/[a-z0-9.+-]+$/.test(mimeType)) {
    throw new AdapterError(502, 'INVALID_IMAGE_DOWNLOAD', 'Downloaded result was not an image')
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

function validateDownloadUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new AdapterError(502, 'INVALID_RESULT_URL', 'Image generation returned an invalid image URL')
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new AdapterError(502, 'INVALID_RESULT_URL', 'Image generation returned an unsafe image URL')
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  const ipv6Hostname = hostname.replace(/^\[|\]$/g, '')
  const blockedHostname =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    ipv6Hostname === '::' ||
    ipv6Hostname === '::1' ||
    /^f[cd][0-9a-f]{2}:/i.test(ipv6Hostname) ||
    /^fe[89ab][0-9a-f]:/i.test(ipv6Hostname) ||
    /^::ffff:(?:7f|0a|a9fe|c0a8|ac1[0-9a-f]|ac2[0-9a-f]|ac3[01])[0-9a-f]*:/i.test(
      ipv6Hostname
    )

  if (!hostname || blockedHostname) {
    throw new AdapterError(502, 'INVALID_RESULT_URL', 'Image generation returned an unsafe image URL')
  }

  return url
}

module.exports = {
  AdapterError,
  MAX_IMAGE_BYTES,
  MAX_PROMPT_LENGTH,
  UPSTREAM_URL,
  bufferToDataUrl,
  buildUpstreamPayload,
  isJsonContentType,
  parseUpstreamResult,
  validateDownloadUrl,
  validateGenerateInput,
}
