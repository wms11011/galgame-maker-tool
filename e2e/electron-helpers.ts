import { _electron as electron, ElectronApplication, Page } from '@playwright/test'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

let _app: ElectronApplication | null = null
let _page: Page | null = null

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  if (_app) return { app: _app, page: _page! }

  _app = await electron.launch({
    args: [
      join(PROJECT_ROOT, 'out', 'main', 'index.js'),
    ],
    executablePath: join(PROJECT_ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  })

  _page = await _app.firstWindow()
  await _page.waitForLoadState('domcontentloaded')
  await _page.waitForTimeout(2000)

  return { app: _app, page: _page }
}

export async function closeApp(): Promise<void> {
  if (_app) {
    await _app.close()
    _app = null
    _page = null
  }
}

/** Execute code in the renderer process and return the result */
export async function evalInRenderer<T>(page: Page, fn: () => T): Promise<T> {
  return page.evaluate(fn)
}

/** Access the Electron main process */
export function getMainProcess(app: ElectronApplication) {
  return app.evaluate(({ app: electronApp }) => {
    return { ready: electronApp.isReady() }
  })
}
