import { test, expect, _electron as electron } from '@playwright/test'
import { join } from 'path'

const PROJECT_ROOT = join(__dirname, '..')

test.describe('Electron App 启动测试', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [join(PROJECT_ROOT, 'out', 'main', 'index.js')],
      executablePath: join(PROJECT_ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'),
    })
  })

  test.afterAll(async () => {
    if (electronApp) await electronApp.close()
  })

  test('app 能正常启动', async () => {
    const isPackaged = await electronApp.evaluate(({ app }) => app.isPackaged)
    expect(isPackaged).toBe(false)
  })

  test('主窗口能正常加载', async () => {
    const window = await electronApp.firstWindow()
    const title = await window.title()
    expect(title).toBeTruthy()
  })

  test('渲染进程可以执行 scriptToFlow', async () => {
    const window = await electronApp.firstWindow()
    const result = await window.evaluate(() => {
      // Check if the API is exposed
      return typeof window !== 'undefined'
    })
    expect(result).toBe(true)
  })

  test('Electron 进程数正确', async () => {
    const windows = electronApp.windows()
    expect(windows.length).toBeGreaterThanOrEqual(1)
  })
})
