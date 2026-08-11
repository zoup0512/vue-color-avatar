'use strict'

const { spawn } = require('node:child_process')
const path = require('node:path')

const commands = [
  [path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js'), []],
  [require.resolve('./index.cjs'), []],
]

const children = commands.map(([script, args]) =>
  spawn(process.execPath, [script, ...args], {
    stdio: 'inherit',
    env: process.env,
  })
)

let stopping = false

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true

  for (const child of children) {
    if (!child.killed) child.kill()
  }

  process.exitCode = exitCode
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping && (code !== 0 || signal)) stop(code || 1)
  })
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
