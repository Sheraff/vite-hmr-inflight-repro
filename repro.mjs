import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'

const control = process.argv.includes('--control')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Work on a copy of ./app so the repo stays clean.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-repro-'))
fs.cpSync('app', root, { recursive: true })

let saved = false

// Makes the transform of a.js slow: resolving './b.js' takes 300 ms.
const slowResolve = {
  name: 'slow-resolve',
  enforce: 'pre',
  async resolveId(id) {
    if (saved && id === './b.js') await sleep(300)
  },
}

// Requests a.js while the HMR update is running,
// as a browser tab or another plugin can.
const requestDuringUpdate = {
  name: 'request-during-update',
  async hotUpdate() {
    if (saved && !control) {
      void this.environment.transformRequest('/a.js')
      await sleep(20)
    }
  },
}

const server = await createServer({
  root,
  configFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true },
  plugins: [slowResolve, requestDuringUpdate],
})
const client = server.environments.client

// 1. Load a.js once.
await client.transformRequest('/a.js')

// 2. Save a.js, and wait for the update and the slow transform to finish.
saved = true
const source = fs.readFileSync(`${root}/a.js`, 'utf8')
fs.writeFileSync(`${root}/a.js`, source.replace('export const a = 1', 'export const a = 2'))
await sleep(1000)

// 3. Fetch a.js the way the browser does after the update.
const mod = await client.moduleGraph.getModuleByUrl('/a.js')
const url = `/a.js?t=${mod.lastHMRTimestamp}`
const { code } = await client.transformRequest(url)
const selfImport = code.match(/as self from ["']([^"']+)/)[1]

console.log(`requested:   ${url}`)
console.log(`self-import: ${selfImport}`)
console.log(selfImport === url ? 'OK: same URL' : 'BUG: a.js imports a different URL of itself, so it runs twice')

await server.close()
fs.rmSync(root, { recursive: true })
process.exit(0)
