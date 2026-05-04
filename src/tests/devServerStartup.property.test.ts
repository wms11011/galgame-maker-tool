// ============================================================
// Task 1 — Bug Condition Exploration Test
// Property 1: Bug Condition — Dev Server Startup Config Bugs
//
// CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
// Failure confirms both bugs exist:
//   Sub-condition A: optimizeDeps.include conflicts with resolve.alias for monaco-editor
//   Sub-condition B: "dev" script lacks a pre-build step before electron-vite dev
//
// Validates: Requirements 1.1, 1.2
// ============================================================

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// __dirname is galgame-maker-tool/src/tests/
// Go up two levels (../../) to reach galgame-maker-tool/
const VITE_CONFIG_PATH = resolve(__dirname, '../../electron.vite.config.ts')
const PACKAGE_JSON_PATH = resolve(__dirname, '../../package.json')

describe('Dev Server Startup — Bug Condition Exploration (Property 1)', () => {
  /**
   * Sub-condition A — Validates: Requirements 1.1
   *
   * The renderer config in electron.vite.config.ts has both:
   *   resolve.alias: { 'monaco-editor': resolve(..., 'monaco-editor/esm/vs/editor/editor.api') }
   *   optimizeDeps.include: ['monaco-editor/esm/vs/editor/editor.api']
   *
   * These conflict: Vite cannot pre-bundle a dependency that is already aliased.
   * The fix is to remove the optimizeDeps.include entry.
   *
   * EXPECTED ON UNFIXED CODE: FAIL — the entry IS present, confirming the bug.
   */
  it('Sub-condition A: optimizeDeps.include should NOT contain the aliased monaco-editor path', () => {
    const configSource = readFileSync(VITE_CONFIG_PATH, 'utf-8')

    // Assert the conflicting entry is absent (will FAIL on unfixed code)
    expect(configSource).not.toMatch("'monaco-editor/esm/vs/editor/editor.api'")
  })

  /**
   * Sub-condition B — Validates: Requirements 1.2
   *
   * The "dev" script in package.json is currently "electron-vite dev" with no prior
   * build step. electron-vite attempts to launch Electron pointing at
   * dist-electron/main/index.js, which does not exist on a clean checkout.
   *
   * The fix is: "electron-vite build && electron-vite dev"
   *
   * EXPECTED ON UNFIXED CODE: FAIL — the script does NOT include a build step.
   */
  it('Sub-condition B: "dev" script should include a build step before electron-vite dev', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
    const devScript: string = pkg.scripts?.dev ?? ''

    // Assert the dev script includes a pre-build step (will FAIL on unfixed code)
    expect(devScript).toMatch(/electron-vite build.*&&.*electron-vite dev/)
  })
})
