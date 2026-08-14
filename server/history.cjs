'use strict'

// 生图历史存储：按天目录保存生成图片到服务器本地磁盘
//
// 目录结构（示例）:
//   /var/data/avatar-history/20260814/20260814_153045_ab12.png
//   /var/data/avatar-history/20260814/20260814_153126_cd34.jpg
//
// 目录根可用环境变量 HISTORY_DIR 覆盖：
//   - 服务器默认 /var/data/avatar-history
//   - 本地开发（win32）默认 server/data/avatar-history，避免写入系统根目录失败

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_HISTORY_DIR =
  process.platform === 'win32'
    ? path.join(__dirname, 'data', 'avatar-history')
    : '/var/data/avatar-history'

const DAY_DIR_PATTERN = /^\d{8}$/
const FILE_NAME_PATTERN = /^\d{8}_\d{6}_[0-9a-f]{4}\.(png|jpg|webp)$/

function getHistoryDir() {
  return process.env.HISTORY_DIR || DEFAULT_HISTORY_DIR
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDay(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function formatTime(date) {
  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

/** 解析 data URL，返回 { mime, ext, data }；无法解析时返回 null */
function parseDataUrl(dataUrl) {
  const match = /^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/.exec(dataUrl || '')
  if (!match) return null
  const mime = match[1]
  const ext = mime === 'image/jpeg' ? 'jpg' : mime.replace('image/', '')
  return { mime, ext, data: Buffer.from(match[2], 'base64') }
}

/** 保存一张生成图，返回可访问的相对 URL；解析失败返回 null */
async function saveGeneratedImage(dataUrl) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null

  const now = new Date()
  const day = formatDay(now)
  const time = formatTime(now)
  const dir = path.join(getHistoryDir(), day)
  await fs.promises.mkdir(dir, { recursive: true })

  const name = `${day}_${time}_${crypto.randomBytes(2).toString('hex')}.${parsed.ext}`
  await fs.promises.writeFile(path.join(dir, name), parsed.data)
  return `/avatar/api/history/files/${day}/${name}`
}

/** 列出全部历史图片（最新在前），返回相对 URL 数组 */
async function listHistory() {
  const root = getHistoryDir()

  let dayDirs
  try {
    dayDirs = await fs.promises.readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const images = []
  for (const entry of dayDirs) {
    if (!entry.isDirectory() || !DAY_DIR_PATTERN.test(entry.name)) continue

    let files
    try {
      files = await fs.promises.readdir(path.join(root, entry.name))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }

    for (const file of files) {
      if (FILE_NAME_PATTERN.test(file)) {
        images.push(`/avatar/api/history/files/${entry.name}/${file}`)
      }
    }
  }

  // 文件名含日期时间前缀，字典序倒序即最新在前
  return images.sort().reverse()
}

/** 清空全部历史目录 */
async function clearHistory() {
  const root = getHistoryDir()

  let dayDirs
  try {
    dayDirs = await fs.promises.readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }

  await Promise.all(
    dayDirs
      .filter((entry) => entry.isDirectory() && DAY_DIR_PATTERN.test(entry.name))
      .map((entry) =>
        fs.promises.rm(path.join(root, entry.name), { recursive: true, force: true })
      )
  )
}

/**
 * 校验历史文件请求（防路径穿越），返回文件绝对路径；非法返回 null
 */
function resolveHistoryFile(day, name) {
  if (!DAY_DIR_PATTERN.test(day)) return null
  if (!FILE_NAME_PATTERN.test(name)) return null
  return path.join(getHistoryDir(), day, name)
}

module.exports = {
  clearHistory,
  formatDay,
  formatTime,
  getHistoryDir,
  listHistory,
  parseDataUrl,
  resolveHistoryFile,
  saveGeneratedImage,
}
