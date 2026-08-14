const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  clearHistory,
  formatDay,
  formatTime,
  listHistory,
  parseDataUrl,
  resolveHistoryFile,
  saveGeneratedImage,
} = require('../history.cjs')

const PNG_DATA_URL = 'data:image/png;base64,aGVsbG8='
const JPEG_DATA_URL = 'data:image/jpeg;base64,aGVsbG8='
const WEBP_DATA_URL = 'data:image/webp;base64,aGVsbG8='

let tempDir

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'avatar-history-'))
  process.env.HISTORY_DIR = tempDir
})

afterEach(async () => {
  await fs.promises.rm(tempDir, { recursive: true, force: true })
  delete process.env.HISTORY_DIR
})

describe('parseDataUrl', () => {
  test('extracts mime, extension and buffer', () => {
    expect(parseDataUrl(PNG_DATA_URL)).toEqual({
      mime: 'image/png',
      ext: 'png',
      data: Buffer.from('aGVsbG8=', 'base64'),
    })
    expect(parseDataUrl(JPEG_DATA_URL).ext).toBe('jpg')
    expect(parseDataUrl(WEBP_DATA_URL).ext).toBe('webp')
  })

  test('rejects invalid data URLs', () => {
    expect(parseDataUrl('')).toBeNull()
    expect(parseDataUrl('data:text/plain;base64,aGVsbG8=')).toBeNull()
    expect(parseDataUrl('not-a-data-url')).toBeNull()
  })
})

describe('saveGeneratedImage', () => {
  test('saves into the day directory with a timestamp name', async () => {
    const url = await saveGeneratedImage(PNG_DATA_URL)
    expect(url).toMatch(/^\/avatar\/api\/history\/files\/\d{8}\/\d{8}_\d{6}_[0-9a-f]{4}\.png$/)

    const [day, name] = url.split('/').slice(-2)
    const now = new Date()
    expect(day).toBe(formatDay(now))

    const saved = await fs.promises.readFile(path.join(tempDir, day, name))
    expect(saved.toString()).toBe('hello')
  })

  test('returns null for unparsable input without writing files', async () => {
    expect(await saveGeneratedImage('invalid')).toBeNull()
    expect(await fs.promises.readdir(tempDir)).toEqual([])
  })
})

describe('listHistory', () => {
  test('returns all images newest first across days', async () => {
    await fs.promises.mkdir(path.join(tempDir, '20260813'), { recursive: true })
    await fs.promises.mkdir(path.join(tempDir, '20260814'), { recursive: true })
    await fs.promises.writeFile(
      path.join(tempDir, '20260813', '20260813_100000_aaaa.png'),
      'x'
    )
    await fs.promises.writeFile(
      path.join(tempDir, '20260814', '20260814_090000_bbbb.jpg'),
      'x'
    )
    await fs.promises.writeFile(
      path.join(tempDir, '20260814', '20260814_090001_cccc.png'),
      'x'
    )

    expect(await listHistory()).toEqual([
      '/avatar/api/history/files/20260814/20260814_090001_cccc.png',
      '/avatar/api/history/files/20260814/20260814_090000_bbbb.jpg',
      '/avatar/api/history/files/20260813/20260813_100000_aaaa.png',
    ])
  })

  test('ignores unrelated files and invalid names', async () => {
    const day = formatDay(new Date())
    const dir = path.join(tempDir, day)
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(path.join(dir, 'readme.txt'), 'x')
    await fs.promises.writeFile(path.join(dir, '20260814.png'), 'x')
    await fs.promises.writeFile(path.join(dir, 'malware.png'), 'x')

    expect(await listHistory()).toEqual([])
  })

  test('returns an empty list when the directory does not exist', async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
    expect(await listHistory()).toEqual([])
  })
})

describe('clearHistory', () => {
  test('removes all day directories', async () => {
    await saveGeneratedImage(PNG_DATA_URL)
    await saveGeneratedImage(JPEG_DATA_URL)
    expect((await listHistory()).length).toBe(2)

    await clearHistory()
    expect(await listHistory()).toEqual([])
  })

  test('is a no-op when the directory does not exist', async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true })
    await expect(clearHistory()).resolves.toBeUndefined()
  })
})

describe('resolveHistoryFile', () => {
  test('resolves a valid day/name pair', () => {
    expect(resolveHistoryFile('20260814', '20260814_153045_ab12.png')).toBe(
      path.join(tempDir, '20260814', '20260814_153045_ab12.png')
    )
  })

  test('rejects path traversal and invalid names', () => {
    expect(resolveHistoryFile('20260814', '..%2Fetc%2Fpasswd')).toBeNull()
    expect(resolveHistoryFile('20260814', '..\\..\\passwd')).toBeNull()
    expect(resolveHistoryFile('..', '20260814_153045_ab12.png')).toBeNull()
    expect(resolveHistoryFile('2026081', '20260814_153045_ab12.png')).toBeNull()
    expect(resolveHistoryFile('20260814', 'avatar.png')).toBeNull()
    expect(resolveHistoryFile('20260814', '20260814_153045.png')).toBeNull()
  })
})

describe('time formatting', () => {
  test('formats date and time with zero padding', () => {
    expect(formatDay(new Date(2026, 7, 5))).toBe('20260805')
    expect(formatTime(new Date(2026, 7, 5, 9, 3, 7))).toBe('090307')
  })
})
