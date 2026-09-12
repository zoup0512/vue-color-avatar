'use strict'

require('dotenv/config')

const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const {
  AdapterError,
  MAX_IMAGE_BYTES,
  UPSTREAM_URL,
  bufferToDataUrl,
  buildUpstreamPayload,
  isJsonContentType,
  parseUpstreamResult,
  validateDownloadUrl,
  validateGenerateInput,
} = require('./grsai.cjs')
const {
  clearHistory,
  listHistory,
  resolveHistoryFile,
  saveGeneratedImage,
} = require('./history.cjs')

const ROUTE = '/avatar/api/generate'
const HISTORY_ROUTE = '/avatar/api/history'
const HISTORY_FILE_PREFIX = '/avatar/api/history/files/'
const MAX_REQUEST_BYTES = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 16 * 1024
const MAX_UPSTREAM_RESPONSE_BYTES = 1024 * 1024
const MAX_DOWNLOAD_BYTES = 16 * 1024 * 1024
// gpt-image 系列带参考图的图生图单次耗时通常 60–150s，60s 会稳定超时。
// 这里留到 180s，仍在 nginx proxy_read_timeout (300s) 之内，避免连接被 nginx 提前关闭。
const UPSTREAM_TIMEOUT_MS = 180 * 1000
const DOWNLOAD_TIMEOUT_MS = 20 * 1000

function sendJson(response, statusCode, body) {
  const payload = Buffer.from(JSON.stringify(body))
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(payload)
}

function toAdapterError(error) {
  if (error instanceof AdapterError) return error
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return new AdapterError(504, 'UPSTREAM_TIMEOUT', 'Image generation service timed out')
  }
  return new AdapterError(502, 'UPSTREAM_UNAVAILABLE', 'Image generation service is unavailable')
}

async function readStream(stream, maxBytes, tooLargeError) {
  const chunks = []
  let totalBytes = 0

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalBytes += buffer.length
    if (totalBytes > maxBytes) throw tooLargeError
    chunks.push(buffer)
  }

  return Buffer.concat(chunks, totalBytes)
}

async function readJsonRequest(request) {
  const contentLength = request.headers['content-length']
  if (contentLength !== undefined) {
    const bytes = Number(contentLength)
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new AdapterError(400, 'INVALID_CONTENT_LENGTH', 'Invalid Content-Length header')
    }
    if (bytes > MAX_REQUEST_BYTES) {
      throw new AdapterError(413, 'BODY_TOO_LARGE', 'Request body is too large')
    }
  }

  const body = await readStream(
    request,
    MAX_REQUEST_BYTES,
    new AdapterError(413, 'BODY_TOO_LARGE', 'Request body is too large')
  )
  if (body.length === 0) {
    throw new AdapterError(400, 'INVALID_JSON', 'Request body must contain JSON')
  }

  try {
    return JSON.parse(body.toString('utf8'))
  } catch {
    throw new AdapterError(400, 'INVALID_JSON', 'Request body contains invalid JSON')
  }
}

async function readFetchResponse(response, maxBytes, error) {
  const contentLength = response.headers.get('content-length')
  if (contentLength !== null) {
    const bytes = Number(contentLength)
    if (Number.isFinite(bytes) && bytes > maxBytes) throw error
  }

  if (!response.body) return Buffer.alloc(0)
  return readStream(response.body, maxBytes, error)
}

async function fetchWithTimeout(url, options, timeoutMs, consume) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return await consume(response)
  } finally {
    clearTimeout(timer)
  }
}

async function generateImage(input, apiKey) {
  let upstream
  try {
    upstream = await fetchWithTimeout(
      UPSTREAM_URL,
      {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(buildUpstreamPayload(input)),
      },
      UPSTREAM_TIMEOUT_MS,
      async (response) => ({
        status: response.status,
        body: await readFetchResponse(
          response,
          MAX_UPSTREAM_RESPONSE_BYTES,
          new AdapterError(
            502,
            'INVALID_UPSTREAM_RESPONSE',
            'Image generation response was too large'
          )
        ),
      })
    )
  } catch (error) {
    throw toAdapterError(error)
  }

  let upstreamPayload = null
  try {
    if (upstream.body.length > 0) upstreamPayload = JSON.parse(upstream.body.toString('utf8'))
  } catch {
    throw new AdapterError(
      502,
      'INVALID_UPSTREAM_RESPONSE',
      'Image generation service returned invalid data'
    )
  }

  const result = parseUpstreamResult(upstream.status, upstreamPayload)
  const imageUrl = validateDownloadUrl(result.imageUrl)

  let downloaded
  try {
    downloaded = await fetchWithTimeout(
      imageUrl,
      {
        method: 'GET',
        redirect: 'error',
        headers: { Accept: 'image/*' },
      },
      DOWNLOAD_TIMEOUT_MS,
      async (response) => {
        if (!response.ok) {
          throw new AdapterError(
            502,
            'IMAGE_DOWNLOAD_FAILED',
            'Generated image could not be downloaded'
          )
        }

        return {
          contentType: response.headers.get('content-type'),
          body: await readFetchResponse(
            response,
            MAX_DOWNLOAD_BYTES,
            new AdapterError(502, 'IMAGE_TOO_LARGE', 'Generated image exceeded the download limit')
          ),
        }
      }
    )
  } catch (error) {
    throw toAdapterError(error)
  }

  return {
    image: bufferToDataUrl(downloaded.body, downloaded.contentType),
    taskId: result.taskId,
  }
}

/** 生图成功后自动保存历史（含生图 prompt；保存失败不阻断生图响应） */
async function persistGeneratedImage(image, prompt) {
  try {
    await saveGeneratedImage(image, prompt)
  } catch (error) {
    console.error('[history] failed to save generated image:', error.message)
  }
}

/** 返回历史图片文件（仅限按天目录下的合法文件名，防路径穿越） */
async function serveHistoryFile(response, day, name) {
  const filePath = resolveHistoryFile(day, name)
  if (!filePath) {
    throw new AdapterError(404, 'NOT_FOUND', 'File not found')
  }

  let stat
  try {
    stat = await fs.promises.stat(filePath)
  } catch {
    throw new AdapterError(404, 'NOT_FOUND', 'File not found')
  }
  if (!stat.isFile()) {
    throw new AdapterError(404, 'NOT_FOUND', 'File not found')
  }

  const ext = path.extname(name).slice(1)
  response.writeHead(200, {
    'Content-Type': ext === 'jpg' ? 'image/jpeg' : `image/${ext}`,
    'Content-Length': stat.size,
    // 文件名含唯一时间戳，内容不可变，可长期缓存
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
  fs.createReadStream(filePath).pipe(response)
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url || '/', 'http://localhost')
    const method = request.method || 'GET'

    if (url.pathname === ROUTE) {
      if (method !== 'POST') {
        response.setHeader('Allow', 'POST')
        throw new AdapterError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
      }

      if (!isJsonContentType(request.headers['content-type'])) {
        throw new AdapterError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json')
      }

      const apiKey = process.env.GRSAI_API_KEY
      if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new AdapterError(503, 'SERVICE_NOT_CONFIGURED', 'Image generation service is not configured')
      }

      const input = validateGenerateInput(await readJsonRequest(request))
      const result = await generateImage(input, apiKey.trim())
      await persistGeneratedImage(result.image, input.prompt)
      sendJson(response, 200, result)
      return
    }

    if (method === 'GET' && url.pathname === HISTORY_ROUTE) {
      sendJson(response, 200, { images: await listHistory() })
      return
    }

    if (method === 'DELETE' && url.pathname === HISTORY_ROUTE) {
      await clearHistory()
      sendJson(response, 200, { ok: true })
      return
    }

    if (method === 'GET' && url.pathname.startsWith(HISTORY_FILE_PREFIX)) {
      const [day, name] = url.pathname.slice(HISTORY_FILE_PREFIX.length).split('/')
      await serveHistoryFile(response, day, name)
      return
    }

    throw new AdapterError(404, 'NOT_FOUND', 'Route not found')
  } catch (error) {
    const normalized =
      error instanceof AdapterError
        ? error
        : new AdapterError(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
    sendJson(response, normalized.statusCode, {
      error: { code: normalized.code, message: normalized.message },
    })
  }
}

function createServer() {
  return http.createServer(handleRequest)
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8787
  createServer().listen(port, '0.0.0.0', () => {
    console.log(`Avatar API listening on port ${port}`)
  })
}

module.exports = {
  DOWNLOAD_TIMEOUT_MS,
  MAX_DOWNLOAD_BYTES,
  MAX_REQUEST_BYTES,
  UPSTREAM_TIMEOUT_MS,
  createServer,
  generateImage,
  handleRequest,
  readJsonRequest,
}
